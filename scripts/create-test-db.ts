/**
 * Creates an isolated test database (default: foodhub_test) next to the main one in the same Neon project,
 * so destructive integration tests never touch the main database. Prints no secrets.
 * Usage: npx tsx scripts/create-test-db.ts [name]
 */
import "dotenv/config";
import { Client } from "@neondatabase/serverless";

async function main() {
  const name = process.argv[2] ?? "foodhub_test";
  if (!/^[a-z_][a-z0-9_]{0,40}$/.test(name)) throw new Error("invalid database name");
  const direct = process.env.DIRECT_URL;
  if (!direct) throw new Error("DIRECT_URL is not set");
  const url = new URL(direct);
  const mainDb = url.pathname.slice(1);
  if (mainDb === name) throw new Error("test database name equals the main database");

  const client = new Client({ connectionString: direct });
  await client.connect();
  try {
    const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (exists.rowCount) {
      console.log(`database "${name}" already exists (main database "${mainDb}" untouched)`);
    } else {
      await client.query(`CREATE DATABASE "${name}"`);
      console.log(`created database "${name}" (main database "${mainDb}" untouched)`);
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("error:", (e as Error).message);
  process.exit(1);
});
