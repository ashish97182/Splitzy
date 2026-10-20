import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addGroupMember,
  deleteGroup,
  updateGroup,
  removeGroupMember,
} from "../controller/groupcontroller.js";
import {
  addExpense,
  getGroupExpenses,
  deleteExpense,
  updateExpense,
  
} from "../controller/expenseController.js";
import { getGroupBalances } from "../controller/balanceController.js";
import {
  addSettlement,
  getGroupSettlements,
  deleteSettlement,
} from "../controller/settlementController.js";
import { validateRequest } from "../middleware/validateRequest.js";
import {
  addMemberSchema,
  createExpenseSchema,
  createGroupSchema,
  createSettlementSchema,
  expenseParams,
  groupIdParams,
  memberParams,
  settlementParams,
  updateExpenseSchema,
  updateGroupSchema,
} from "../validation/schemas.js";
const router = express.Router();

// ----------------------------------------------------
// Core Group Routes
// ----------------------------------------------------
router.post("/", protect, validateRequest({ body: createGroupSchema }), createGroup);
router.get("/", protect, getUserGroups);
router.get("/:groupId", protect, validateRequest({ params: groupIdParams }), getGroupById);

// ----------------------------------------------------
// Group Members
// ----------------------------------------------------
router.post(
  "/:groupId/members",
  protect,
  validateRequest({ params: groupIdParams, body: addMemberSchema }),
  addGroupMember,
);

// ----------------------------------------------------
// Group Expenses
// ----------------------------------------------------
router.post(
  "/:groupId/expenses",
  protect,
  validateRequest({ params: groupIdParams, body: createExpenseSchema }),
  addExpense,
);
router.get(
  "/:groupId/expenses",
  protect,
  validateRequest({ params: groupIdParams }),
  getGroupExpenses,
);
router.delete(
  "/:groupId/expenses/:expenseId",
  protect,
  validateRequest({ params: expenseParams }),
  deleteExpense,
);
router.put(
  "/:groupId/expenses/:expenseId",
  protect,
  validateRequest({ params: expenseParams, body: updateExpenseSchema }),
  updateExpense,
);

// ----------------------------------------------------
// BALANCES
// ----------------------------------------------------
router.get(
  "/:groupId/balances",
  protect,
  validateRequest({ params: groupIdParams }),
  getGroupBalances,
);
// ----------------------------------------------------
// Settlements
// ----------------------------------------------------

router.post(
  "/:groupId/settlements",
  protect,
  validateRequest({ params: groupIdParams, body: createSettlementSchema }),
  addSettlement,
);
router.get(
  "/:groupId/settlements",
  protect,
  validateRequest({ params: groupIdParams }),
  getGroupSettlements,
);
router.delete(
  "/:groupId/settlements/:settlementId",
  protect,
  validateRequest({ params: settlementParams }),
  deleteSettlement,
);


// ----------------------------------------------------
// Group Admin Endpoints
// ----------------------------------------------------
router.delete(
  "/:groupId/members/:userId",
  protect,
  validateRequest({ params: memberParams }),
  removeGroupMember,
);
router.put(
  "/:groupId",
  protect,
  validateRequest({ params: groupIdParams, body: updateGroupSchema }),
  updateGroup,
);
router.delete(
  "/:groupId",
  protect,
  validateRequest({ params: groupIdParams }),
  deleteGroup,
);


export default router;
