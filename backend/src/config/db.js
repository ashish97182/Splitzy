import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

dotenv.config();

// 1. Setup the standard pg Pool
const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// 2. Initialize the Prisma adapter
const adapter = new PrismaPg(pool);

// 3. Initialize PrismaClient with the adapter
const prisma = new PrismaClient({ adapter });

// Export the configured Prisma instance
export default prisma;
