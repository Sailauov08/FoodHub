import "dotenv/config";
import { vi } from "vitest";

// Integration tests run against a real PostgreSQL database (a dedicated Neon branch).
// They TRUNCATE all tables, so they never use DATABASE_URL directly.
if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
process.env.BETTER_AUTH_SECRET ??= "integration-test-secret-not-for-production";

// Next.js request-scoped APIs are not available outside a request.
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
