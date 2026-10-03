import prisma from "../config/db.js";
// 👉 Import your new service
import calculateSplits from "../../services/splitService.js";

// ----------------------------------------------------
// POST /api/groups/:groupId/expenses
// ----------------------------------------------------
export const addExpense = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { description, amount, category, splitType, splits, paidBy } =
      req.body;
    const requesterId = req.user.userId;

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
    const newExpense = await prisma.$transaction(
      async (tx) => {
        const expense = await tx.expenses.create({
          data: {
            groupId: groupId,
            paidBy: payerId,
            description,
            amount,
            category: category || "GENERAL",
            splitType: splitType || "CUSTOM",
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

        return tx.expenses.findUnique({
          where: { id: expense.id },
          include: {
            users: { select: { id: true, name: true } },
            expense_splits: {
              include: { users: { select: { name: true } } },
            },
          },
        });
      },
      { maxWait: 5000, timeout: 10000 },
    );

    return res.status(201).json({
      message: "Expense added successfully!",
      expense: newExpense,
    });
  } catch (error) {
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
    const isMember = await prisma.group_members.findFirst({
      where: { groupId, userId: requesterId },
    });

    if (!isMember) {
      return res
        .status(403)
        .json({ error: "You are not a member of this group." });
    }

    const expenses = await prisma.expenses.findMany({
      where: { groupId: groupId },
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

    // 4. Delete splits and expense atomically
    await prisma.$transaction(async (tx) => {
      await tx.expense_splits.deleteMany({
        where: { expenseId },
      });

      await tx.expenses.delete({
        where: {
          id: expenseId,
          groupId,
        },
      });
    });

    return res.status(200).json({
      message: "Expense deleted successfully!",
    });
  } catch (error) {
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
      },
    });

    if (!existingExpense) {
      return res.status(404).json({
        error: "Expense not found.",
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
    const updatedExpense = await prisma.$transaction(
      async (tx) => {
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
        return tx.expenses.findUnique({
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
        });
      },
      {
        maxWait: 5000,
        timeout: 10000,
      },
    );

    return res.status(200).json({
      message: "Expense updated successfully!",
      expense: updatedExpense,
    });
  } catch (error) {
    console.error("Error updating expense:", error);

    return res.status(500).json({
      error: "Internal server error.",
    });
  }
};