import http from "node:http";
import app from "./src/app.js";
import prisma from "./src/config/db.js";

const PORT = Number(process.env.PORT || 5000);
const server = http.createServer(app);

await prisma.$connect();

server.listen(PORT, () => {
  console.log(`Splitzy API listening on port ${PORT}`);
});

let shuttingDown = false;
const shutdown = (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Received ${signal}; shutting down.`);

  server.close(async (error) => {
    try {
      await prisma.$disconnect();
    } catch {
      console.error("Failed to disconnect from the database cleanly.");
      process.exitCode = 1;
    }

    if (error) {
      console.error("Failed to close the HTTP server cleanly.");
      process.exitCode = 1;
    } else {
      console.log("HTTP server and database connections closed.");
    }
  });
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
