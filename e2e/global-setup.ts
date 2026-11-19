import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import "dotenv/config";

/**
 * Prepares the E2E database: applies migrations and seeds the demo menu plus throw-away staff accounts
 * with random passwords (written to e2e/.auth/staff.json, which is git-ignored).
 */
export default async function globalSetup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    if (process.env.E2E_BASE_URL && process.env.E2E_ADMIN_EMAIL) return; // external target with provided accounts
    throw new Error("TEST_DATABASE_URL is required for E2E tests (use a separate Neon branch).");
  }
  const pw = () => `E2e-${randomBytes(12).toString("base64url")}`;
  const staff = {
    admin: { email: "e2e-admin@foodhub.test", password: pw() },
    kitchen: { email: "e2e-kitchen@foodhub.test", password: pw() },
  };
  const env = {
    ...process.env,
    DATABASE_URL: url,
    DIRECT_URL: url,
    SEED_ADMIN_EMAIL: staff.admin.email,
    SEED_ADMIN_PASSWORD: staff.admin.password,
    SEED_KITCHEN_EMAIL: staff.kitchen.email,
    SEED_KITCHEN_PASSWORD: staff.kitchen.password,
  };
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  // Staff users may already exist from a previous run; reset them so the fresh passwords apply.
  execSync("npx tsx e2e/reset-staff.ts", { stdio: "inherit", env });
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env });
  mkdirSync("e2e/.auth", { recursive: true });
  writeFileSync("e2e/.auth/staff.json", JSON.stringify(staff));
}
