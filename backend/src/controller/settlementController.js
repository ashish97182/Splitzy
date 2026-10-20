import prisma from "../config/db.js";
import { calculateBalances } from "../../services/balanceService.js";
import { fromMinorUnits, toMinorUnits } from "../../services/money.js";
import simplifyDebts from "../../services/debtService.js";
import { lockActiveGroup } from "../../services/groupLock.js";
import { isSerializationConflict } from "../../services/isSerializationConflict.js";

function settlementTransactions(summary) {
  const balances = Object.fromEntries(
    summary.map(({ userId, netBalance }) => [userId, netBalance]),
  );
  return simplifyDebts(balances);
}

// ----------------------------------------------------
// POST /api/groups/:groupId/settlements
// ----------------------------------------------------
export const addSettlement = async (req, res) => {
  const { groupId } = req.params;
  const { payeeId, amount } = req.body;
  const payerId = req.user.userId; // The person currently logged in making the payment

  if (payerId === payeeId) {
    return res
      .status(400)
      .json({ error: "A settlement payer and payee must be different users." });
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        if (!(await lockActiveGroup(tx, groupId))) {
          return { status: 404, body: { error: "Group not found." } };
        }

        const members = await tx.group_members.findMany({
          where: { groupId, userId: { in: [payerId, payeeId] } },
          select: { userId: true },
        });
        if (members.length !== 2) {
          return {
            status: 400,
            body: { error: "Both users must be members of the group." },
          };
        }

        const { summary } = await calculateBalances(groupId, tx);
        const debt = settlementTransactions(summary).find(
          (transaction) =>
            transaction.from === payerId && transaction.to === payeeId,
        );

        const requestedMinorUnits = toMinorUnits(amount);
        const outstandingMinorUnits = debt ? toMinorUnits(debt.amount) : 0;

        if (requestedMinorUnits > outstandingMinorUnits) {
          return {
            status: 400,
            body: {
              error: debt
                ? `Settlement exceeds the outstanding amount of ${new Intl.NumberFormat(
                    "en-IN",
                    {
                      style: "currency",
                      currency: "INR",
                    },
                  ).format(fromMinorUnits(outstandingMinorUnits))}.`
                : "The payer does not currently owe the selected payee.",
            },
          };
        }

        // CRITICAL FIX: The payer is the one who "pays" the expense, getting the credit.
        // The payee is the one who "consumes" the split, receiving the deduction.
        const newExpense = await tx.expenses.create({
          data: {
            groupId,
            paidBy: payerId,
            description: "Payment",
            amount: fromMinorUnits(requestedMinorUnits), // Sent as Decimal
            category: "SETTLEMENT",
            splitType: "EXACT",
            expense_splits: {
              create: {
                userId: payeeId,
                amount: fromMinorUnits(requestedMinorUnits), // Sent as Decimal
              },
            },
          },
        });

        return {
          status: 201,
          body: {
            message: "Payment recorded successfully.",
            settlement: newExpense,
          },
        };
      },
      {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: "Serializable",
      },
    );

    return res.status(result.status).json(result.body);
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({
        error:
          "Group ledger changed concurrently. Recheck the balance and retry.",
      });
    }
    console.error("Error in addSettlement:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// GET /api/groups/:groupId/settlements
// ----------------------------------------------------
export const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requesterId = req.user.userId;

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const isMember = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });
    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }

    const settlements = await prisma.expenses.findMany({
      where: { groupId, category: "SETTLEMENT", deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        users: { select: { id: true, name: true } },
        expense_splits: {
          include: { users: { select: { id: true, name: true } } },
        },
      },
    });

    const formattedSettlements = settlements.map((settlement) => {
      // FIX: Since paidBy is the Payer, the split contains the Payee
      const payeeSplit = settlement.expense_splits[0];
      return {
        id: settlement.id,
        amount: settlement.amount,
        date: settlement.createdAt,
        payer: {
          id: settlement.users.id, // mapped from paidBy
          name: settlement.users.name,
        },
        payee: {
          id: payeeSplit?.users.id, // mapped from expense_splits
          name: payeeSplit?.users.name,
        },
      };
    });

    return res.status(200).json({
      count: formattedSettlements.length,
      settlements: formattedSettlements,
    });
  } catch (error) {
    console.error("Error in getGroupSettlements:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// DELETE /api/groups/:groupId/settlements/:settlementId
// ----------------------------------------------------
export const deleteSettlement = async (req, res) => {
  try {
    const { groupId, settlementId } = req.params;
    const requesterId = req.user.userId;

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    const membership = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });
    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }

    const settlement = await prisma.expenses.findFirst({
      where: {
        id: settlementId,
        groupId,
        category: "SETTLEMENT",
        deletedAt: null,
      },
      include: { expense_splits: true },
    });
    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found." });
    }

    // FIX: Realigned the RBAC checks based on the new logic
    const isPayer = settlement.paidBy === requesterId;
    const isPayee = settlement.expense_splits.some(
      (split) => split.userId === requesterId,
    );
    const isAdmin = membership.role === "ADMIN";

    if (!isPayer && !isPayee && !isAdmin) {
      return res.status(403).json({
        error:
          "Only the people involved in this payment (or an Admin) can delete it.",
      });
    }

    const result = await prisma.$transaction(
      async (tx) => {
        if (!(await lockActiveGroup(tx, groupId))) {
          return { status: 404, error: "Group not found." };
        }

        const currentMembership = await tx.group_members.findFirst({
          where: { groupId, userId: requesterId },
        });
        if (!currentMembership) {
          return { status: 403, error: "You are not a member of this group." };
        }

        const currentSettlement = await tx.expenses.findFirst({
          where: {
            id: settlementId,
            groupId,
            category: "SETTLEMENT",
            deletedAt: null,
          },
          include: { expense_splits: { select: { userId: true } } },
        });
        if (!currentSettlement) {
          return { status: 404, error: "Settlement not found." };
        }

        const canDelete =
          currentSettlement.paidBy === requesterId ||
          currentSettlement.expense_splits.some(
            (split) => split.userId === requesterId,
          ) ||
          currentMembership.role === "ADMIN";

        if (!canDelete) {
          return {
            status: 403,
            error:
              "Only the people involved in this payment (or an Admin) can delete it.",
          };
        }

        await tx.expenses.update({
          where: { id: settlementId },
          data: { deletedAt: new Date() },
        });

        return { status: 200 };
      },
      { isolationLevel: "Serializable" },
    );

    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      message:
        "Settlement archived successfully. Its history has been preserved.",
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res
        .status(409)
        .json({ error: "Group ledger changed concurrently. Please retry." });
    }
    console.error("Error in deleteSettlement:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};
