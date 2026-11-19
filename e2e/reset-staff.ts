import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";

/** Removes E2E staff accounts so global setup can recreate them with fresh random passwords. */
const db = new PrismaClient({ adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL! }) });
db.user
  .deleteMany({ where: { email: { endsWith: "@foodhub.test" } } })
  .then((r) => console.log(`reset ${r.count} e2e staff users`))
  .finally(() => db.$disconnect());
