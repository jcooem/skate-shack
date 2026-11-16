import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Reuse one client (one connection pool) per process, including across
// hot reloads in development. Created lazily on first use so that `next build`
// doesn't need database credentials.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getClient() {
  if (!globalForPrisma.prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString && process.env.NEXT_PHASE !== "phase-production-build") {
      console.warn("DATABASE_URL is not set — database queries will fail. Copy .env.example to .env and fill it in.");
    }
    globalForPrisma.prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5 }) });
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
