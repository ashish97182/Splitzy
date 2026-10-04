export const DEFAULT_GROUP_MEMBERS = ["Nishant", "Rahul", "Sumriddhi"];

function readArray(key) {
  try {
    const value = localStorage.getItem(key);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readGroupSettlementRecords(groupId) {
  return readArray(`splitzy-settlements-${groupId}`);
}

export function calculateGroupSettlementData({
  groupId,
  groupName,
  members,
  expenses,
  settlementRecords = [],
}) {
  const expenseBalances = Object.fromEntries(
    members.map((member) => [member, 0])
  );

  expenses.forEach((expense) => {
    const splitBetween = Array.isArray(expense.splitBetween)
      ? expense.splitBetween
      : [];

    if (splitBetween.length === 0) {
      return;
    }

    const amount = Number(expense.amount) || 0;
    const share = amount / splitBetween.length;

    splitBetween.forEach((member) => {
      if (expenseBalances[member] !== undefined) {
        expenseBalances[member] -= share;
      }
    });

    if (expenseBalances[expense.paidBy] !== undefined) {
      expenseBalances[expense.paidBy] += amount;
    }
  });

  const creditors = Object.keys(expenseBalances)
    .filter((member) => expenseBalances[member] > 0.01)
    .map((member) => ({ member, amount: expenseBalances[member] }));
  const debtors = Object.keys(expenseBalances)
    .filter((member) => expenseBalances[member] < -0.01)
    .map((member) => ({
      member,
      amount: Math.abs(expenseBalances[member]),
    }));
  const settlements = [];
  let creditorIndex = 0;
  let debtorIndex = 0;

  while (
    creditorIndex < creditors.length &&
    debtorIndex < debtors.length
  ) {
    const creditor = creditors[creditorIndex];
    const debtor = debtors[debtorIndex];
    const calculatedAmount = Math.min(creditor.amount, debtor.amount);
    const id = `${debtor.member}-${creditor.member}`;
    const isPaid = settlementRecords.includes(id);
    const adjustment = settlementRecords.find(
      (record) =>
        record &&
        typeof record === "object" &&
        record.type === "amount-adjustment" &&
        record.id === id
    );

    if (!isPaid) {
      settlements.push({
        id,
        groupId,
        groupName,
        from: debtor.member,
        to: creditor.member,
        amount: adjustment && Number(adjustment.amount) > 0
          ? Number(adjustment.amount)
          : Math.round(calculatedAmount * 100) / 100,
      });
    }

    creditor.amount -= calculatedAmount;
    debtor.amount -= calculatedAmount;

    if (creditor.amount < 0.01) creditorIndex++;
    if (debtor.amount < 0.01) debtorIndex++;
  }

  // The group summary reflects the same outstanding settlements shown globally.
  const balances = Object.fromEntries(
    members.map((member) => [member, 0])
  );
  settlements.forEach((settlement) => {
    balances[settlement.from] -= settlement.amount;
    balances[settlement.to] += settlement.amount;
  });

  return { balances, settlements };
}

export function saveSettlementAmountAdjustment(groupId, settlementId, amount) {
  const records = readGroupSettlementRecords(groupId);
  const updatedRecords = records.filter(
    (record) =>
      !record ||
      typeof record !== "object" ||
      record.type !== "amount-adjustment" ||
      record.id !== settlementId
  );
  updatedRecords.push({
    type: "amount-adjustment",
    id: settlementId,
    amount: Math.round(Number(amount) * 100) / 100,
  });

  localStorage.setItem(
    `splitzy-settlements-${groupId}`,
    JSON.stringify(updatedRecords)
  );

  return updatedRecords;
}

export function markSettlementPaid(groupId, settlementId) {
  const records = readGroupSettlementRecords(groupId);
  const updatedRecords = records.includes(settlementId)
    ? records
    : [...records, settlementId];

  localStorage.setItem(
    `splitzy-settlements-${groupId}`,
    JSON.stringify(updatedRecords)
  );

  return updatedRecords;
}
