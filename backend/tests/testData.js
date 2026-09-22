
import prisma from "../lib/prisma.js";

// Create or get test users
const rahul = await prisma.users.upsert({
  where: {
    email: "rahul@test.com"
  },
  update: {},
  create: {
    name: "Rahul",
    email: "rahul@test.com",
    passwordHash: "test-password-hash",
    avatar: "",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

const priya = await prisma.users.upsert({
  where: {
    email: "priya@test.com"
  },
  update: {},
  create: {
    name: "Priya",
    email: "priya@test.com",
    passwordHash: "test-password-hash",
    avatar: "",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

const aman = await prisma.users.upsert({
  where: {
    email: "aman@test.com"
  },
  update: {},
  create: {
    name: "Aman",
    email: "aman@test.com",
    passwordHash: "test-password-hash",
    avatar: "",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

console.log("Test users ready");


// Create group
const group = await prisma.groups.create({
  data: {
    name: "Splitzy Test Group",
    description: "Testing expense splitting",
    createdBy: rahul.id,
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

console.log("Group created:");
console.log(group);


// Add members
await prisma.group_members.createMany({
  data: [
    {
      userId: rahul.id,
      groupId: group.id,
      role: "ADMIN",
      joinedAt: new Date()
    },
    {
      userId: priya.id,
      groupId: group.id,
      role: "MEMBER",
      joinedAt: new Date()
    },
    {
      userId: aman.id,
      groupId: group.id,
      role: "MEMBER",
      joinedAt: new Date()
    }
  ]
});

console.log("Members added");


// Create expense
const expense = await prisma.expenses.create({
  data: {
    groupId: group.id,
    paidBy: rahul.id,
    description: "Dinner",
    amount: 900,
    category: "FOOD",
    splitType: "EQUAL",
    createdAt: new Date(),
    updatedAt: new Date()
  }
});

console.log("Expense created:");
console.log(expense);


// Create expense splits
const splits = await prisma.expense_splits.createMany({
  data: [
    {
      expenseId: expense.id,
      userId: rahul.id,
      amount: 300
    },
    {
      expenseId: expense.id,
      userId: priya.id,
      amount: 300
    },
    {
      expenseId: expense.id,
      userId: aman.id,
      amount: 300
    }
  ]
});

console.log("Expense splits created:");
console.log(splits);


await prisma.$disconnect();

