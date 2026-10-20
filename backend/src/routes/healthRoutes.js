import express from "express";
import { liveness, readiness } from "../controller/healthController.js";

const router = express.Router();

router.get("/health", liveness);
router.get("/ready", readiness);

export default router;
