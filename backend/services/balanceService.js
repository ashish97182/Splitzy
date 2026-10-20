import prisma from "../src/config/db.js";
import { fromMinorUnits } from "./money.js";
import { calculateBalanceTotals } from "./balanceMath.js";

export { calculateBalanceTotals };

const calculateBalances = async (groupId, database = prisma) => {
  const expenses = await database.expenses.findMany({
    where: { groupId, deletedAt: null },
    include: { expense_splits: true },
  });

  const balancesMinorUnits = calculateBalanceTotals(expenses);

  const summary = Object.keys(balancesMinorUnits).map((userId) => ({
    userId,
    netBalance: fromMinorUnits(balancesMinorUnits[userId]),
  }));

  return { summary, balancesMinorUnits };
};

export { calculateBalances };
