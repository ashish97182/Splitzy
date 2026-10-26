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

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
}));
app.use(verifyOrigin(allowedOrigins));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/api/", healthRoutes);
app.use("/api/auth", authroutes);
app.use("/api/groups", groupRoutes);
app.use(errorHandler);
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Splitzy API is running",
  });
});

export default app;
