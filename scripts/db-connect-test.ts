/**
 * Opens N fresh clients per adapter (new connection each time) and counts connection failures.
 * Usage: npx tsx scripts/db-connect-test.ts [n]
 */
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function run(kind: "neon" | "pg", n: number) {
  const connectionString = process.env.DATABASE_URL!;
  let ok = 0;
  const times: number[] = [];
  const errors: string[] = [];
  for (let i = 0; i < n; i++) {
    const adapter = kind === "neon" ? new PrismaNeon({ connectionString }) : new PrismaPg({ connectionString });
    const db = new PrismaClient({ adapter });
    const t0 = Date.now();
    try {
      await db.product.count();
      ok++;
      times.push(Date.now() - t0);
    } catch (e) {
      const err = e as { message?: string; type?: string };
      errors.push(err.message || err.type || String(e));
    }
    await db.$disconnect().catch(() => undefined);
  }
  times.sort((a, b) => a - b);
  console.log(`${kind}: ${ok}/${n} ok, median ${times[Math.floor(times.length / 2)] ?? "-"} ms, max ${times.at(-1) ?? "-"} ms, errors: ${JSON.stringify([...new Set(errors)].slice(0, 3))}`);
}

async function main() {
  const n = Number(process.argv[2] ?? 12);
  await run("neon", n);
  await run("pg", n);
}

main().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});
