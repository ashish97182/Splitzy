import express from "express";
import healthcheck from "../controller/healthController.js";

const router = express.Router();

router.get("/health", healthcheck);

export default router;
