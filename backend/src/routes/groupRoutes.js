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
const router = express.Router();

// ----------------------------------------------------
// Core Group Routes
// ----------------------------------------------------
router.post("/", protect, createGroup);
router.get("/", protect, getUserGroups);
router.get("/:groupId", protect, getGroupById);

// ----------------------------------------------------
// Group Members
// ----------------------------------------------------
router.post("/:groupId/members", protect, addGroupMember);

// ----------------------------------------------------
// Group Expenses
// ----------------------------------------------------
router.post("/:groupId/expenses", protect, addExpense);
router.get("/:groupId/expenses", protect, getGroupExpenses);
router.delete("/:groupId/expenses/:expenseId", protect, deleteExpense);
router.put("/:groupId/expenses/:expenseId", protect, updateExpense);

// ----------------------------------------------------
// BALANCES
// ----------------------------------------------------
router.get("/:groupId/balances", protect, getGroupBalances);
// ----------------------------------------------------
// Settlements
// ----------------------------------------------------

router.post("/:groupId/settlements", protect, addSettlement);
router.get("/:groupId/settlements", protect, getGroupSettlements);
router.delete("/:groupId/settlements/:settlementId", protect, deleteSettlement);


// ----------------------------------------------------
// Group Admin Endpoints
// ----------------------------------------------------
router.delete("/:groupId/members/:userId", protect, removeGroupMember);
router.put("/:groupId", protect, updateGroup);
router.delete("/:groupId", protect, deleteGroup);


export default router;
