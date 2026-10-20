import test from "node:test";
import assert from "node:assert/strict";
import {
  addMemberSchema,
  createExpenseSchema,
  createSettlementSchema,
  loginSchema,
  registerSchema,
  updateGroupSchema,
} from "../../src/validation/schemas.js";

const userA = "a0b1c2d3-e4f5-4678-9012-3456789abcde";
const userB = "b0b1c2d3-e4f5-4678-9012-3456789abcde";

test("registration trims name/email but preserves password whitespace", () => {
  const result = registerSchema.parse({
    name: "  Splitzy User ",
    email: " USER@example.com ",
    password: " pass word ",
  });
  assert.equal(result.name, "Splitzy User");
  assert.equal(result.email, "user@example.com");
  assert.equal(result.password, " pass word ");
});

test("registration and login reject malformed or excessive values", () => {
  assert.equal(registerSchema.safeParse({
    name: "",
    email: "bad",
    password: "short",
  }).success, false);
  assert.equal(loginSchema.safeParse({
    email: "user@example.com",
    password: "a".repeat(73),
  }).success, false);
  assert.equal(loginSchema.safeParse({
    email: "user@example.com",
    password: 12345678,
  }).success, false);
});

test("member and group schemas validate email and non-empty updates", () => {
  assert.equal(addMemberSchema.safeParse({ email: "not-an-email" }).success, false);
  assert.equal(updateGroupSchema.safeParse({}).success, false);
  assert.equal(updateGroupSchema.safeParse({ name: "  New name " }).success, true);
});

test("expense schema validates ids, enums, values, precision, and extra fields", () => {
  const valid = {
    description: " Dinner ",
    amount: 10.01,
    splitType: "PERCENTAGE",
    splits: [
      { userId: userA, value: 50 },
      { userId: userB, value: 50 },
    ],
  };
  assert.equal(createExpenseSchema.safeParse(valid).success, true);
  assert.equal(createExpenseSchema.safeParse({
    ...valid,
    amount: 0,
  }).success, false);
  assert.equal(createExpenseSchema.safeParse({
    ...valid,
    splitType: "UNKNOWN",
  }).success, false);
  assert.equal(createExpenseSchema.safeParse({
    ...valid,
    splits: [{ userId: userA, value: 50 }, { userId: userA, value: 50 }],
  }).success, false);
  assert.equal(createExpenseSchema.safeParse({
    ...valid,
    amount: 10.001,
  }).success, false);
  assert.equal(createExpenseSchema.safeParse({
    ...valid,
    unexpected: true,
  }).success, false);
});

test("settlement schema requires UUID and positive exact-cent amount", () => {
  assert.equal(createSettlementSchema.safeParse({ payeeId: userB, amount: 1.01 }).success, true);
  assert.equal(createSettlementSchema.safeParse({ payeeId: "user", amount: 1 }).success, false);
  assert.equal(createSettlementSchema.safeParse({ payeeId: userB, amount: -1 }).success, false);
});
