import prisma from "../config/db.js";

// ----------------------------------------------------
// POST /api/groups/:groupId/settlements
// ----------------------------------------------------
export const addSettlement = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { payeeId, amount } = req.body; 
    const payerId = req.user.userId; // The person logged in is making the payment

    if (!payeeId || !amount || amount <= 0) {
      return res
        .status(400)
        .json({ error: "Payee ID and a valid amount are required." });
    }

    const groupMembers = await prisma.group_members.findMany({
      where: { groupId, userId: { in: [payerId, payeeId] } },
    });

    if (groupMembers.length !== 2) {
      return res
        .status(400)
        .json({ error: "Both users must be members of the group." });
    }

    // 2. Create the settlement as a special Expense transaction
    const settlement = await prisma.$transaction(async (tx) => {
      // A. Create an expense categorized as a SETTLEMENT
      const newExpense = await tx.expenses.create({
        data: {
          groupId: groupId,
          paidBy: payerId, // The debtor paying the money
          description: "Payment",
          amount: amount,
          category: "SETTLEMENT", // Special category so frontend can show a payment icon
          splitType: "EXACT",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // B. Give 100% of the split burden to the person receiving the money
      await tx.expense_splits.create({
        data: {
          expenseId: newExpense.id,
          userId: payeeId, // The creditor receiving the money
          amount: amount,
        },
      });

      return newExpense;
    });

    return res.status(201).json({
      message: "Payment recorded successfully!",
      settlement,
    });
  } catch (error) {
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

    // 1. Verify membership
    const isMember = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }

    // 2. Fetch all expenses categorized as a SETTLEMENT
    const settlements = await prisma.expenses.findMany({
      where: {
        groupId: groupId,
        category: "SETTLEMENT",
      },
      orderBy: { createdAt: "desc" }, // Newest payments first
      include: {
        // The person who paid (Payer)
        users: {
          select: { id: true, name: true },
        },
        // The person who received it (Payee)
        expense_splits: {
          include: {
            users: { select: { id: true, name: true } },
          },
        },
      },
    });

    // 3. Format the data to make it incredibly easy for the frontend to map over
    const formattedSettlements = settlements.map((settlement) => {
      // Settlements only have 1 split (100% goes to the payee), so we grab the first item
      const payeeSplit = settlement.expense_splits[0];

      return {
        id: settlement.id,
        amount: settlement.amount,
        date: settlement.createdAt,
        payer: {
          id: settlement.users.id,
          name: settlement.users.name,
        },
        payee: {
          id: payeeSplit?.users.id,
          name: payeeSplit?.users.name, // Safely access in case a user was deleted
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
// POST /api/groups/:groupId/settlements/:settlementId
// ----------------------------------------------------
export const deleteSettlement = async (req, res) => {
  try {
    const { groupId, settlementId } = req.params;
    const requesterId = req.user.userId;

    // 1. Check the requester's membership and role in the group
    const membership = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }

    // 2. Find the settlement AND include the splits to see who received the money
    const settlement = await prisma.expenses.findFirst({
      where: {
        id: settlementId,
        groupId: groupId,
        category: "SETTLEMENT",
      },
      include: {
        expense_splits: true, // 👉 Added this to get the payee details
      },
    });

    if (!settlement) {
      return res.status(404).json({ error: "Settlement not found." });
    }

    // 3. Determine if the requester has permission to delete this record
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

    // 4. Delete the splits and the expense safely in one transaction
    await prisma.$transaction([
      // First, delete the record of who received the money
      prisma.expense_splits.deleteMany({
        where: { expenseId: settlementId },
      }),
      // Then, delete the settlement itself
      prisma.expenses.delete({
        where: { id: settlementId },
      }),
    ]);

    return res.status(200).json({
      message: "Settlement deleted successfully. Balances restored!",
    });
  } catch (error) {
    console.error("Error in deleteSettlement:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};