import { toMinorUnits } from "./money.js";

export function calculateBalanceTotals(expenses) {
  const balancesMinorUnits = Object.create(null);

  for (const expense of expenses) {
    balancesMinorUnits[expense.paidBy] = (balancesMinorUnits[expense.paidBy] ?? 0)
      + toMinorUnits(expense.amount);
    for (const split of expense.expense_splits) {
      balancesMinorUnits[split.userId] = (balancesMinorUnits[split.userId] ?? 0)
        - toMinorUnits(split.amount);
    }
  }

  return balancesMinorUnits;
}
