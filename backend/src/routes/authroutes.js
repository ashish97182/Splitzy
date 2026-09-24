
import express from "express";
import { login, registerUser } from "../controller/authcontroller.js";
import {protect} from "../middleware/authMiddleware.js";

const router = express.Router();

// Change "/auth/api" to "/register"
router.post("/register", registerUser);
router.post("/login", login);
router.get("/test", protect, (req, res) => {
  res.json({
    success: true,
    message: "JWT authentication is working",
    user: req.user,
  });
});

export default router;
