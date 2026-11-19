import "dotenv/config";
import { execSync } from "node:child_process";

/** Applies committed migrations to TEST_DATABASE_URL (a separate Neon branch). */
const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("TEST_DATABASE_URL is not set.");
  process.exit(1);
}
execSync("npx prisma migrate deploy", { stdio: "inherit", env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url } });
