import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import healthRoutes from "./routes/healthRoutes.js";
import authroutes from "./routes/authroutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import cookieParser from "cookie-parser";
import { getAllowedOrigins } from "./config/environment.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { verifyOrigin } from "./middleware/verifyOrigin.js";

const app = express();
const allowedOrigins = getAllowedOrigins();

if (process.env.TRUST_PROXY !== undefined) {
  app.set("trust proxy", Number(process.env.TRUST_PROXY));
}

// app.use(helmet());
// app.use(cors({
//   origin(origin, callback) {
//     callback(null, !origin || allowedOrigins.includes(origin));
//   },
//   methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
//   allowedHeaders: ["Content-Type", "Authorization"],
//   credentials: true,
// }));

// 1. Prevent Helmet from blocking cross-origin resources
app.use(helmet({ crossOriginResourcePolicy: false }));

// 2. Bulletproof CORS setup using substring matching
app.use(cors({
  origin: function (origin, callback) {
    // Allow Postman/curl (no origin) OR explicitly allow any Vercel URL
    if (!origin || origin.includes("vercel.app")) {
      return callback(null, true);
    }
    // Fallback to your environment variables
    callback(null, allowedOrigins.includes(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept"],
  credentials: true,
}));

// 3. Force all OPTIONS (preflight) requests to be handled by CORS
app.options("*", cors());

// 4. Temporarily comment this out as it might conflict with the CORS package
// app.use(verifyOrigin(allowedOrigins));
app.use(verifyOrigin(allowedOrigins));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api/", healthRoutes);
app.use("/api/auth", authroutes);
app.use("/api/groups", groupRoutes);
app.use(errorHandler);


export default app;
