
function calculateBalances(expenses, expenseSplits) {
  const balances = {};

  // Money paid by each person
  for (const expense of expenses) {
    if (!(expense.paidBy in balances)) {
      balances[expense.paidBy] = 0;
    }

    balances[expense.paidBy] += Number(expense.amount);
  }

  // Money owed by each person
  for (const split of expenseSplits) {
    if (!(split.userId in balances)) {
      balances[split.userId] = 0;
    }

    balances[split.userId] -= Number(split.amount);
  }

  return balances;
}

export default calculateBalances;

