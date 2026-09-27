import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Driver-adapter mode: PrismaClient talks to Postgres through `pg` directly
// instead of spawning a native query-engine binary. This is also Prisma's
// recommended pattern for serverless/edge deploys (Vercel + Neon).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Standard Next.js dev-mode singleton so hot-reload doesn't exhaust
// the Postgres connection pool with a fresh PrismaClient per reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
