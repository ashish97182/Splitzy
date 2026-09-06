
function simplifyDebts(balances) {
  const creditors = [];
  const debtors = [];

  // Separate creditors and debtors
  for (const personId in balances) {
    const balance = balances[personId];

    if (balance > 0) {
      creditors.push({
        personId,
        balance
      });
    } else if (balance < 0) {
      debtors.push({
        personId,
        balance
      });
    }
  }

  const transactions = [];

  let i = 0;
  let j = 0;

  // Match debtors with creditors
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(
      -debtors[i].balance,
      creditors[j].balance
    );

    transactions.push({
      from: debtors[i].personId,
      to: creditors[j].personId,
      amount
    });

    debtors[i].balance += amount;
    creditors[j].balance -= amount;

    if (debtors[i].balance === 0) {
      i++;
    }

    if (creditors[j].balance === 0) {
      j++;
    }
  }

  return transactions;
}

export default simplifyDebts;
