import prisma from "../config/db.js";
import calculateSplits from "../../services/splitService.js";
import { lockActiveGroup } from "../../services/groupLock.js";
import { isSerializationConflict } from "../../services/isSerializationConflict.js";

// ----------------------------------------------------
// POST /api/groups/:groupId/expenses
// ----------------------------------------------------
export const addExpense = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, amount, category, splitType, splits, paidBy } =
      req.body;
    const requesterId = req.user.userId;

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    if (!description || !amount || !splits || splits.length === 0) {
      return res
        .status(400)
        .json({ error: "Description, total amount, and splits are required." });
    }

    const groupMembers = await prisma.group_members.findMany({
      where: { groupId: groupId },
      select: { userId: true },
    });
    const memberIds = groupMembers.map((m) => m.userId);

    // 2. Validate the requester and the payer are in the group
    const payerId = paidBy || requesterId;
    if (!memberIds.includes(requesterId)) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }
    if (!memberIds.includes(payerId)) {
      return res
        .status(400)
        .json({ error: "The person who paid must be a member of the group." });
    }

    // 3. Transform the request data for your splitService
    const participants = [];
    const values = [];

    for (const split of splits) {
      if (!memberIds.includes(split.userId)) {
        return res
          .status(400)
          .json({ error: `User ${split.userId} is not in this group.` });
      }
      participants.push(split.userId);
      // Support either "value" or "amount" keys from the frontend
      if (splitType !== "EQUAL") {
        values.push(split.value !== undefined ? split.value : split.amount);
      }
    }

    // 4. 👉 Call your robust splitService!
    let calculatedSplits;
    try {
      calculatedSplits = calculateSplits({
        amount: amount,
        splitType: splitType,
        participants: participants,
        values: values,
      });
    } catch (serviceError) {
      // Catch any errors thrown by your service (e.g., "Percentages must add up to 100")
      return res.status(400).json({ error: serviceError.message });
    }

    // 5. Run the Database Transaction
    const result = await prisma.$transaction(
      async (tx) => {
        if (!await lockActiveGroup(tx, groupId)) {
          return { failure: { status: 404, error: "Group not found." } };
        }

        const currentMemberIds = (await tx.group_members.findMany({
          where: { groupId },
          select: { userId: true },
        })).map((member) => member.userId);
        if (!currentMemberIds.includes(requesterId)) {
          return { failure: { status: 403, error: "You are not a member of this group." } };
        }
        if (!currentMemberIds.includes(payerId)) {
          return { failure: { status: 400, error: "The person who paid must be a member of the group." } };
        }
        if (participants.some((participantId) => !currentMemberIds.includes(participantId))) {
          return { failure: { status: 400, error: "Every split participant must be a current group member." } };
        }

        const expense = await tx.expenses.create({
          data: {
            groupId: groupId,
            paidBy: payerId,
            description,
            amount,
            category: category || "GENERAL",
            splitType,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Map the array returned by your service to include the new expenseId
        const finalSplitsToInsert = calculatedSplits.map((s) => ({
          expenseId: expense.id,
          userId: s.userId,
          amount: s.amount,
        }));

        await tx.expense_splits.createMany({
          data: finalSplitsToInsert,
        });

        return {
          expense: await tx.expenses.findUnique({
          where: { id: expense.id },
          include: {
            users: { select: { id: true, name: true } },
            expense_splits: {
              include: { users: { select: { name: true } } },
            },
          },
          }),
        };
      },
      { maxWait: 5000, timeout: 10000, isolationLevel: "Serializable" },
    );
    if (result.failure) {
      return res.status(result.failure.status).json({ error: result.failure.error });
    }

    return res.status(201).json({
      message: "Expense added successfully!",
      expense: result.expense,
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({ error: "Group ledger changed concurrently. Please retry." });
    }
    console.error("Error in addExpense:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// GET /api/groups/:groupId/expenses
// ----------------------------------------------------
export const getGroupExpenses = async (req, res) => {
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

    const expenses = await prisma.expenses.findMany({
      where: { groupId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        users: {
          select: { id: true, name: true, email: true },
        },
        expense_splits: {
          include: {
            users: { select: { id: true, name: true } },
          },
        },
      },
    });

    return res.status(200).json({
      count: expenses.length,
      expenses: expenses,
    });
  } catch (error) {
    console.error("Error in getGroupExpenses:", error);
    return res.status(500).json({ error: "Internal server error." });
  }
};

// ----------------------------------------------------
// DELETE /api/groups/:groupId/expenses/:expenseId
// ----------------------------------------------------
export const deleteExpense = async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;
    const requesterId = req.user.userId;

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // 1. Check group membership
    const membership = await prisma.group_members.findFirst({
      where: {
        groupId,
        userId: requesterId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: "You are not in this group.",
      });
    }

    // 2. Find the expense and its splits
    const expense = await prisma.expenses.findFirst({
      where: {
        id: expenseId,
        groupId,
        deletedAt: null,
      },
      include: {
        expense_splits: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!expense) {
      return res.status(404).json({
        error: "Expense not found.",
      });
    }

    // 3. Check permissions
    const isPayer = expense.paidBy === requesterId;

    const isPayee = expense.expense_splits.some(
      (split) => split.userId === requesterId,
    );

    const isAdmin = membership.role === "ADMIN";

    if (!isPayer && !isPayee && !isAdmin) {
      return res.status(403).json({
        error: "Unauthorized to delete this expense.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (!await lockActiveGroup(tx, groupId)) {
        return { status: 404, error: "Group not found." };
      }
      const currentMembership = await tx.group_members.findFirst({
        where: { groupId, userId: requesterId },
      });
      const currentExpense = await tx.expenses.findFirst({
        where: { id: expenseId, groupId, deletedAt: null },
        include: { expense_splits: { select: { userId: true } } },
      });
      if (!currentMembership) return { status: 403, error: "You are not in this group." };
      if (!currentExpense) return { status: 404, error: "Expense not found." };
      const canDelete = currentExpense.paidBy === requesterId
        || currentExpense.expense_splits.some((split) => split.userId === requesterId)
        || currentMembership.role === "ADMIN";
      if (!canDelete) return { status: 403, error: "Unauthorized to delete this expense." };

      await tx.expenses.update({
        where: { id: expenseId },
        data: { deletedAt: new Date() },
      });
      return { status: 200 };
    }, { isolationLevel: "Serializable" });
    if (result.status !== 200) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      message: "Expense archived successfully. Its history has been preserved.",
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({ error: "Group ledger changed concurrently. Please retry." });
    }
    console.error("Error deleting expense:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};

// ----------------------------------------------------
// PUT /api/groups/:groupId/expenses/:expenseId
// ----------------------------------------------------
export const updateExpense = async (req, res) => {
  try {
    const { groupId, expenseId } = req.params;

    const { description, amount, category, splitType, splits, paidBy } =
      req.body;

    const requesterId = req.user.userId;

    const group = await prisma.groups.findFirst({
      where: { id: groupId, deletedAt: null },
      select: { id: true },
    });
    if (!group) {
      return res.status(404).json({ error: "Group not found." });
    }

    // 1. Check whether the requester belongs to the group
    const membership = await prisma.group_members.findFirst({
      where: {
        groupId,
        userId: requesterId,
      },
    });

    if (!membership) {
      return res.status(403).json({
        error: "You are not a member of this group.",
      });
    }

    // 2. Fetch the existing expense
    const existingExpense = await prisma.expenses.findFirst({
      where: {
        id: expenseId,
        groupId,
        deletedAt: null,
      },
    });

    if (!existingExpense) {
      return res.status(404).json({
        error: "Expense not found.",
      });
    }

    if (existingExpense.category === "SETTLEMENT") {
      return res.status(400).json({
        error: "Settlement entries must be changed through the settlement routes.",
      });
    }

    // 3. Only the original payer or an admin can edit
    if (existingExpense.paidBy !== requesterId && membership.role !== "ADMIN") {
      return res.status(403).json({
        error: "Only the Payer or an Admin can edit this.",
      });
    }

    // 4. Validate required fields
    if (
      typeof description !== "string" ||
      !description.trim() ||
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      typeof splitType !== "string" ||
      !Array.isArray(splits) ||
      splits.length === 0
    ) {
      return res.status(400).json({
        error:
          "Valid description, positive amount, splitType, and non-empty splits are required.",
      });
    }

    // 5. Get all group members
    const groupMembers = await prisma.group_members.findMany({
      where: { groupId },
      select: { userId: true },
    });

    const memberIds = groupMembers.map((member) => member.userId);

    // 6. Validate the payer
    // If paidBy is omitted, retain the existing payer.
    const payerId = paidBy || existingExpense.paidBy;

    if (!memberIds.includes(payerId)) {
      return res.status(400).json({
        error: "The person who paid must be a member of the group.",
      });
    }

    // 7. Validate split participants and prepare calculation inputs
    const participants = [];
    const values = [];
    const seenParticipants = new Set();

    for (const split of splits) {
      if (!split || typeof split.userId !== "string") {
        return res.status(400).json({
          error: "Every split must have a valid userId.",
        });
      }

      if (!memberIds.includes(split.userId)) {
        return res.status(400).json({
          error: `User ${split.userId} is not in this group.`,
        });
      }

      if (seenParticipants.has(split.userId)) {
        return res.status(400).json({
          error: `Duplicate split participant: ${split.userId}.`,
        });
      }

      seenParticipants.add(split.userId);
      participants.push(split.userId);

      if (splitType !== "EQUAL") {
        const value = split.value !== undefined ? split.value : split.amount;

        if (value === undefined || value === null) {
          return res.status(400).json({
            error: `A split value is required for user ${split.userId}.`,
          });
        }

        values.push(value);
      }
    }

    // 8. Calculate splits on the backend
    let calculatedSplits;

    try {
      calculatedSplits = calculateSplits({
        amount,
        splitType,
        participants,
        values,
      });
    } catch (serviceError) {
      return res.status(400).json({
        error: serviceError.message,
      });
    }

    // 9. Update expense and replace splits in one transaction
    const updateResult = await prisma.$transaction(
      async (tx) => {
        if (!await lockActiveGroup(tx, groupId)) {
          return { failure: { status: 404, error: "Group not found." } };
        }
        const currentMembership = await tx.group_members.findFirst({
          where: { groupId, userId: requesterId },
        });
        const currentExpense = await tx.expenses.findFirst({
          where: { id: expenseId, groupId, deletedAt: null },
        });
        if (!currentMembership) {
          return { failure: { status: 403, error: "You are not a member of this group." } };
        }
        if (!currentExpense) {
          return { failure: { status: 404, error: "Expense not found." } };
        }
        if (currentExpense.category === "SETTLEMENT") {
          return { failure: { status: 400, error: "Settlement entries must be changed through the settlement routes." } };
        }
        if (currentExpense.paidBy !== requesterId && currentMembership.role !== "ADMIN") {
          return { failure: { status: 403, error: "Only the Payer or an Admin can edit this." } };
        }
        const currentMemberIds = (await tx.group_members.findMany({
          where: { groupId },
          select: { userId: true },
        })).map((member) => member.userId);
        if (!currentMemberIds.includes(payerId)
          || participants.some((participantId) => !currentMemberIds.includes(participantId))) {
          return { failure: { status: 400, error: "The payer and all split participants must be current group members." } };
        }

        await tx.expenses.update({
          where: { id: expenseId },
          data: {
            description: description.trim(),
            amount,
            category: category ?? existingExpense.category,
            splitType,
            paidBy: payerId,
          },
        });

        // Delete old splits
        await tx.expense_splits.deleteMany({
          where: { expenseId },
        });

        // Insert recalculated splits
        const newSplits = calculatedSplits.map((split) => ({
          expenseId,
          userId: split.userId,
          amount: split.amount,
        }));

        await tx.expense_splits.createMany({
          data: newSplits,
        });

        // Return the updated expense with related data
        return {
          expense: await tx.expenses.findUnique({
          where: { id: expenseId },
          include: {
            users: {
              select: {
                id: true,
                name: true,
              },
            },
            expense_splits: {
              include: {
                users: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          }),
        };
      },
      {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: "Serializable",
      },
    );
    if (updateResult.failure) {
      return res.status(updateResult.failure.status).json({ error: updateResult.failure.error });
    }

    return res.status(200).json({
      message: "Expense updated successfully!",
      expense: updateResult.expense,
    });
  } catch (error) {
    if (isSerializationConflict(error)) {
      return res.status(409).json({ error: "Group ledger changed concurrently. Please retry." });
    }
    console.error("Error updating expense:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};