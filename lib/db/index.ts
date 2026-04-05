/**
 * Database client singleton.
 *
 * Uses a global cache to prevent creating multiple Prisma client instances
 * during hot-reloading in development. In production, a single instance
 * is shared across the application.
 *
 * Security: Connection string is loaded from DATABASE_URL environment variable.
 * Never hardcode credentials.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"],
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export default db;
