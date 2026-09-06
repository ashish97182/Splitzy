
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


// Get latest group
const group = await prisma.groups.findFirst({
  orderBy: {
    createdAt: "desc"
  }
});


// Create expense
const expense = await prisma.expenses.create({
  data: {
    groupId: group.id,
    paidBy: aman.id,
    description: "Hotel",
    amount: 1000,
    category: "ACCOMMODATION",
    splitType: "EXACT",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

console.log("EXACT expense created:");
console.log(expense);


// Create exact splits
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
      amount: 300
    },
    {
      expenseId: expense.id,
      userId: aman.id,
      amount: 500
    }
  ]
});

console.log("EXACT splits created:");
console.log(splits);


await prisma.$disconnect();

