import express from "express";
import healthRoutes from "./routes/healthRoutes.js"
import authroutes from "./routes/authroutes.js"

const app = express();

app.use(express.json());

app.use("/api/", healthRoutes);
app.use("/api/auth", authroutes);


export default app;
