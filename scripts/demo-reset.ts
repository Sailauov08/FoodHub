/**
 * Manual run of the daily showcase reset (the same code the cron endpoint uses).
 *   DEMO_RESET_ENABLED=true npm run demo:reset
 * Uses DATABASE_URL; never point it at a real restaurant's database.
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { resetDemoData } from "../src/server/demo-reset";

async function main() {
  if (process.env.DEMO_RESET_ENABLED !== "true") throw new Error('Refusing to run: set DEMO_RESET_ENABLED="true" (showcase deployments only).');
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");
  const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  try {
    const days = Number(process.env.DEMO_ORDER_RETENTION_DAYS ?? 7);
    const summary = await resetDemoData(db, { retentionDays: Number.isFinite(days) && days >= 1 ? days : 7 });
    console.log(JSON.stringify({ event: "demo.reset", database: new URL(connectionString).pathname, ...summary }, null, 2));
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
