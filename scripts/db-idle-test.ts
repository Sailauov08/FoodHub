/**
 * Reproduces the "stale pooled connection after Neon compute suspend" scenario for both adapters:
 * query → stay idle past Neon's 5-minute auto-suspend → query again on the same client.
 * Usage: npx tsx scripts/db-idle-test.ts [idleSeconds]
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const idle = Number(process.argv[2] ?? 360);
  const connectionString = process.env.DATABASE_URL!;
  const clients = {
    neon: new PrismaClient({ adapter: new PrismaNeon({ connectionString }) }),
    pg: new PrismaClient({ adapter: new PrismaPg({ connectionString }) }),
  };
  for (const [k, c] of Object.entries(clients)) console.log(`${k} first query: ${await c.product.count()}`);
  console.log(`idle ${idle}s…`);
  await new Promise((r) => setTimeout(r, idle * 1000));
  for (const [k, c] of Object.entries(clients)) {
    const t0 = Date.now();
    try {
      const n = await c.product.count();
      console.log(`${k} after idle: ok (${n}) in ${Date.now() - t0} ms`);
    } catch (e) {
      const err = e as { message?: string; type?: string };
      console.log(`${k} after idle: FAILED in ${Date.now() - t0} ms — ${err.message ?? err.type ?? String(e)}`);
      try {
        console.log(`${k} retry: ok (${await c.product.count()})`);
      } catch (e2) {
        console.log(`${k} retry: FAILED — ${(e2 as Error).message}`);
      }
    }
    await c.$disconnect();
  }
}

main().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});
