import express from "express";
import {
  createGroup,
  getUserGroups,
  getGroupById,
  addGroupMember,
} from "../controller/groupcontroller.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, createGroup);
router.get("/", protect, getUserGroups);
router.get("/:groupId", protect, getGroupById);
router.post("/:groupId/members", protect, addGroupMember);

export default router;


