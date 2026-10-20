
import express from "express";
import {
  login,
  registerUser,
  refreshAccessToken,
  logout,
  logoutAllDevices,
} from "../controller/authcontroller.js";
import {protect} from "../middleware/authMiddleware.js";
import { validateRequest } from "../middleware/validateRequest.js";
import { loginSchema, registerSchema } from "../validation/schemas.js";
import { authRateLimit } from "../middleware/rateLimit.js";

const router = express.Router();

// Change "/auth/api" to "/register"
router.post("/register", authRateLimit, validateRequest({ body: registerSchema }), registerUser);
router.post("/login", authRateLimit, validateRequest({ body: loginSchema }), login);
router.post("/logout", logout);
router.post("/logout-all", protect, logoutAllDevices);
router.post("/refresh", authRateLimit, refreshAccessToken);

router.get("/test", protect, (req, res) => {
  res.json({
    success: true,
    message: "JWT authentication is working",
    user: req.user,
  });
});

export default router;
