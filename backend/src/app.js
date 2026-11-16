import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";

import healthRoutes from "./routes/healthRoutes.js";
import authroutes from "./routes/authroutes.js";
import groupRoutes from "./routes/groupRoutes.js";

import { getAllowedOrigins } from "./config/environment.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();
const allowedOrigins = getAllowedOrigins();

// 1. Trust Proxy (Required if behind Render's load balancers or Cloudflare)
if (process.env.TRUST_PROXY !== undefined) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
}

// 2. Security Headers (Configured to safely allow cross-origin API requests)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// 3. Strict Production CORS Setup
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow non-browser clients (like curl/Postman) OR strictly allowed frontend origins
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Block unauthorized domains securely
      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
  }),
);

// 4. Body Parsing & Cookies
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// 5. Request Logging
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// 6. API Routes
app.use("/api/", healthRoutes);
app.use("/api/auth", authroutes);
app.use("/api/groups", groupRoutes);

// 7. Global Error Handler
app.use(errorHandler);

export default app;
