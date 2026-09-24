import express from "express";
import healthRoutes from "./routes/healthRoutes.js"
import authroutes from "./routes/authroutes.js"
import groupRoutes from "./routes/groupRoutes.js";

const app = express();

app.use(express.json());

app.use("/api/", healthRoutes);
app.use("/api/auth", authroutes);
app.use("/api/groups", groupRoutes);


export default app;
