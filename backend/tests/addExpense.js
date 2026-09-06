
import prisma from "./lib/prisma.js";


// Get users
const rahul = await prisma.users.findUnique({
  where: {
    email: "rahul@test.com"
  }
});

const priya = await prisma.users.findUnique({
  where: {
    email: "priya@test.com"
  }
});

const aman = await prisma.users.findUnique({
  where: {
    email: "aman@test.com"
  }
});


// Get the latest group
const group = await prisma.groups.findFirst({
  orderBy: {
    createdAt: "desc"
  }
});


// Create second expense
const expense = await prisma.expenses.create({
  data: {
    groupId: group.id,
    paidBy: priya.id,
    description: "Cab",
    amount: 600,
    category: "TRANSPORT",
    splitType: "EQUAL",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

console.log("Second expense created:");
console.log(expense);


// Create splits
const splits = await prisma.expense_splits.createMany({
  data: [
    {
      expenseId: expense.id,
      userId: rahul.id,
      amount: 200
    },
    {
      expenseId: expense.id,
      userId: priya.id,
      amount: 200
    },
    {
      expenseId: expense.id,
      userId: aman.id,
      amount: 200
    }
  ]
});

console.log("Second expense splits created:");
console.log(splits);


await prisma.$disconnect();

