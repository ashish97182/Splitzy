import prisma from "../config/db.js";
import { isEmailConfigured } from "../../services/mail/email.service.js";

export const liveness = (req, res) => {
  res.json({
    success: true,
    status: "alive",
  });
};

export const readiness = async (req, res) => {
  let timeout;
  try {
    await Promise.race([
      prisma.$queryRaw`SELECT 1`,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Database readiness timed out.")), 2000);
      }),
    ]);
    return res.status(200).json({
      success: true,
      status: "ready",
      dependencies: {
        database: "ready",
        email: isEmailConfigured() ? "configured" : "disabled",
      },
    });
  } catch {
    return res.status(503).json({
      success: false,
      status: "not_ready",
      dependencies: {
        database: "unavailable",
        email: isEmailConfigured() ? "configured" : "disabled",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
};
