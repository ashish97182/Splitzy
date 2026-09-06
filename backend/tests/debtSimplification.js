const balances = [
    { name: "Rahul", balance: 800 },
    { name: "Priya", balance: -500 },
    { name: "Aman", balance: 300 },
    { name: "Riya", balance: -600 }
  ];
  
  const creditors = [];
  const debtors = [];
  
  for (const person of balances) {
    if (person.balance > 0) {
      creditors.push(person);
    } else if (person.balance < 0) {
      debtors.push(person);
    }
  }
  
  let i = 0;
  let j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(
      -debtors[i].balance,
      creditors[j].balance
    );
  
    console.log(
      `${debtors[i].name} → ${creditors[j].name}: ₹${amount}`
    );
  
    debtors[i].balance += amount;
    creditors[j].balance -= amount;
  
    if (debtors[i].balance === 0) {
      i++;
    }
  
    if (creditors[j].balance === 0) {
      j++;
    }
  }

  function calculateBalances(expenses, expenseSplits) {
    const balances = {};
  
    for (const expense of expenses) {
      if (!(expense.paidBy in balances)) {
        balances[expense.paidBy] = 0;
      }
  
      balances[expense.paidBy] += expense.amount;
    }
  
    for (const split of expenseSplits) {
      if (!(split.userId in balances)) {
        balances[split.userId] = 0;
      }
  
      balances[split.userId] -= split.amount;
    }
  
    return balances;
  }

  const expenses = [
    {
      paidBy: "Rahul",
      amount: 900
    },
    {
      paidBy: "Priya",
      amount: 600
    }
  ];
  
  const expenseSplits = [
    { userId: "Rahul", amount: 300 },
    { userId: "Priya", amount: 300 },
    { userId: "Aman", amount: 300 },
  
    { userId: "Priya", amount: 300 },
    { userId: "Aman", amount: 300 }
  ];
  
  const result = calculateBalances(expenses, expenseSplits);
  
  console.log(result);