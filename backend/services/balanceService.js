import prisma from "../src/config/db.js";

const calculateBalances = async (groupId) => {
  const expenses = await prisma.expenses.findMany({
    where: { groupId: groupId },
  });

  const expenseIds = expenses.map((e) => e.id);
  const expenseSplits = await prisma.expense_splits.findMany({
    where: { expenseId: { in: expenseIds } },
  });

  const balances = {};

  for (const expense of expenses) {
    if (!(expense.paidBy in balances)) {
      balances[expense.paidBy] = 0;
    }
    balances[expense.paidBy] += Number(expense.amount);
  }

  for (const split of expenseSplits) {
    if (!(split.userId in balances)) {
      balances[split.userId] = 0;
    }
    balances[split.userId] -= Number(split.amount);
  }

  // 5. Format it into an array so the controller can easily read it
  // This turns { "ankush_id": 2000 } into [{ userId: "ankush_id", netBalance: 2000 }]
  const summary = Object.keys(balances).map((userId) => ({
    userId: userId,
    netBalance: balances[userId],
  }));

  // Return it inside an object so it perfectly matches what the controller expects
  return { summary };
};

export { calculateBalances };
