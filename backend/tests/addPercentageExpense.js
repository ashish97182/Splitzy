
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


// Create percentage expense
const expense = await prisma.expenses.create({
  data: {
    groupId: group.id,
    paidBy: rahul.id,
    description: "Shopping",
    amount: 1000,
    category: "SHOPPING",
    splitType: "PERCENTAGE",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

console.log("PERCENTAGE expense created:");
console.log(expense);


// Calculate percentage shares
const rahulShare = 1000 * 0.50; // 50%
const priyaShare = 1000 * 0.30; // 30%
const amanShare = 1000 * 0.20;  // 20%


// Create splits
const splits = await prisma.expense_splits.createMany({
  data: [
    {
      expenseId: expense.id,
      userId: rahul.id,
      amount: rahulShare
    },
    {
      expenseId: expense.id,
      userId: priya.id,
      amount: priyaShare
    },
    {
      expenseId: expense.id,
      userId: aman.id,
      amount: amanShare
    }
  ]
});

console.log("PERCENTAGE splits created:");
console.log(splits);


await prisma.$disconnect();

