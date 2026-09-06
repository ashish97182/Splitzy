
import prisma from "../lib/prisma.js";
import calculateBalances from "../services/balanceService.js";
import simplifyDebts from "../services/debtService.js";


// Get latest group
const group = await prisma.groups.findFirst({
  orderBy: {
    createdAt: "desc"
  }
});


// Get expenses
const expenses = await prisma.expenses.findMany({
  where: {
    groupId: group.id
  }
});


// Get expense splits
const expenseIds = expenses.map(
  expense => expense.id
);

const expenseSplits = await prisma.expense_splits.findMany({
  where: {
    expenseId: {
      in: expenseIds
    }
  }
});


// Calculate balances
const balances = calculateBalances(
  expenses,
  expenseSplits
);

console.log("\nBalances:");
console.log(balances);


// Simplify debts
const transactions = simplifyDebts(balances);


// Get users
const users = await prisma.users.findMany({
  where: {
    id: {
      in: Object.keys(balances)
    }
  }
});


// Create user ID → name map
const userMap = {};

for (const user of users) {
  userMap[user.id] = user.name;
}


// Display transactions
console.log("\nSimplified Transactions:");

for (const transaction of transactions) {
  console.log(
    `${userMap[transaction.from]} → ${userMap[transaction.to]}: ₹${transaction.amount}`
  );
}


await prisma.$disconnect();

