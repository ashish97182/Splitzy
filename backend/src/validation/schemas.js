import { z } from "zod";

const uuid = z.string().uuid();
const displayName = z.string().trim().min(1).max(80);
const email = z.string().trim().email().max(254).toLowerCase();
const password = z.string().min(8).max(72).refine(
  (value) => Buffer.byteLength(value, "utf8") <= 72,
  "Password must not exceed bcrypt's 72-byte limit.",
);
const amount = z.number()
  .finite()
  .positive()
  .max(999999999.99)
  .refine((value) => Number(value.toFixed(2)) === value, "Amount may have at most two decimal places.");
const splitValue = z.number().finite().nonnegative().max(100000000);
const splitTypes = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES"];
const categories = [
  "GENERAL",
  "FOOD",
  "ACCOMMODATION",
  "SHOPPING",
  "TRANSPORT",
  "OTHER",
];

const expenseSplit = z.object({
  userId: uuid,
  value: splitValue.optional(),
  amount: splitValue.optional(),
}).strict();

const expenseFields = {
  description: z.string().trim().min(1).max(200),
  amount,
  category: z.enum(categories).optional(),
  splitType: z.enum(splitTypes),
  splits: z.array(expenseSplit).min(1).max(100),
  paidBy: uuid.optional(),
};

const expenseBody = z.object(expenseFields).strict().superRefine((data, context) => {
  const ids = data.splits.map((split) => split.userId);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["splits"],
      message: "Split participants must be distinct.",
    });
  }

  if (data.splitType !== "EQUAL") {
    data.splits.forEach((split, index) => {
      if (split.value === undefined && split.amount === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["splits", index, "value"],
          message: "A value is required for every non-equal split.",
        });
      }
    });
  }
});

export const registerSchema = z.object({
  name: displayName,
  email,
  password,
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72).refine(
    (value) => Buffer.byteLength(value, "utf8") <= 72,
    "Password must not exceed bcrypt's 72-byte limit.",
  ),
}).strict();

export const groupIdParams = z.object({ groupId: uuid }).strict();
export const expenseParams = groupIdParams.extend({ expenseId: uuid });
export const settlementParams = groupIdParams.extend({ settlementId: uuid });
export const memberParams = groupIdParams.extend({ userId: uuid });

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).optional(),
}).strict();

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(1000).optional(),
}).strict().refine((data) => data.name !== undefined || data.description !== undefined, {
  message: "At least one group field must be provided.",
});

export const addMemberSchema = z.object({ email }).strict();
export const createExpenseSchema = expenseBody;
export const updateExpenseSchema = expenseBody;

export const createSettlementSchema = z.object({
  payeeId: uuid,
  amount,
}).strict();
