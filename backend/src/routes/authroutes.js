
import express from "express";
import { login, registerUser } from "../controller/authcontroller.js";
const router = express.Router();

// Change "/auth/api" to "/register"
router.post("/register", registerUser);
router.post("/login", login);

export default router;
