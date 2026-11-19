import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { isRetryableOperation, withRetry } from "@/lib/db-retry";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env and add your Neon connection string.");
  }
  const client = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  // Neon suspends idle computes; the first connection while it wakes can fail. Reads are retried with
  // backoff; writes are never retried automatically (checkout is protected by its idempotency key instead).
  return client.$extends({
    query: {
      $allModels: {
        $allOperations({ operation, args, query }) {
          return isRetryableOperation(operation) ? withRetry(() => query(args)) : query(args);
        },
      },
    },
  }) as unknown as PrismaClient;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

/**
 * Without DATABASE_URL (preview mode) no client is created. Property access is allowed (libraries such as
 * the auth adapter inspect the client at import time); any actual query call throws a clear error.
 */
function unavailableClient(): PrismaClient {
  const fail = () => {
    throw new Error("DATABASE_URL is not set (preview mode has no database).");
  };
  const handler: ProxyHandler<() => void> = {
    get: (_t, prop) => (prop === "then" || typeof prop === "symbol" ? undefined : new Proxy(fail, handler)),
    apply: fail,
  };
  return new Proxy(fail, handler) as unknown as PrismaClient;
}
const unavailable = unavailableClient();

export const db = globalForPrisma.prisma ?? (process.env.DATABASE_URL ? createClient() : unavailable);

if (process.env.NODE_ENV !== "production" && process.env.DATABASE_URL) globalForPrisma.prisma = db;
