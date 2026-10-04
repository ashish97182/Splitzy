import dotenv from "dotenv";
dotenv.config();

import app from "./src/app.js";
import prisma from "./src/config/db.js"; // Adjust the path based on where you placed db.js


const PORT = process.env.PORT || 5000;
// Use cookie-parser middleware to parse cookies
const startServer = async () => {
  try {
    await prisma.$connect();
    console.log("✅ PostgreSQL database connected successfully!");
    app.listen(PORT, () => {
      console.log(`Splitzy API running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to connect to the database:", error);
    process.exit(1);
  }
};

startServer();
