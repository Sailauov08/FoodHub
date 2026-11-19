/**
 * Connection reliability check: runs parallel read queries in bursts and reports failures.
 * Usage: npx tsx scripts/db-stress.ts [neon|pg]
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";

async function client(kind: string) {
  const connectionString = process.env.DATABASE_URL!;
  if (kind === "pg") {
    const { PrismaPg } = await import("@prisma/adapter-pg");
    return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  }
  const { PrismaNeon } = await import("@prisma/adapter-neon");
  return new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
}

async function main() {
  const kind = process.argv[2] ?? "neon";
  const db = await client(kind);
  let ok = 0;
  const failures: string[] = [];
  const t0 = Date.now();
  for (let burst = 0; burst < 8; burst++) {
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, () => Promise.all([db.product.count(), db.category.findMany({ take: 3 }), db.order.count()])),
    );
    for (const r of results) {
      if (r.status === "fulfilled") ok++;
      else {
        const e = r.reason as { message?: string; error?: { message?: string; code?: string }; type?: string };
        failures.push(e?.message ?? e?.error?.message ?? e?.type ?? String(e));
      }
    }
    // Idle gap so pooled sockets sit idle like between page views.
    await new Promise((r) => setTimeout(r, burst % 2 ? 6000 : 500));
  }
  console.log(`${kind}: ok=${ok} failed=${failures.length} in ${Date.now() - t0} ms`);
  for (const f of [...new Set(failures)].slice(0, 5)) console.log(`  failure: ${f.slice(0, 300)}`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error("fatal", e);
  process.exit(1);
});
