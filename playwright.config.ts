import { defineConfig, devices } from "@playwright/test";
import "dotenv/config";

/**
 * Two suites:
 *  - `npm run test:e2e`          full flows against a production build connected to TEST_DATABASE_URL (separate Neon branch).
 *  - `npm run test:e2e:preview`  database-independent UI tests against a build with DATABASE_URL empty (preview mode).
 * Set E2E_BASE_URL to test an already running server instead.
 */
const preview = process.env.npm_lifecycle_event === "test:e2e:preview" || process.env.E2E_PREVIEW === "1";
const PORT = preview ? 3200 : 3100;
const external = process.env.E2E_BASE_URL;
const testDb = process.env.TEST_DATABASE_URL;

const dbEnv: Record<string, string> = preview
  ? { DATABASE_URL: "", DIRECT_URL: "" }
  : testDb
    ? { DATABASE_URL: testDb, DIRECT_URL: testDb }
    : {};

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: preview ? undefined : "./e2e/global-setup.ts",
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: preview
    ? [{ name: "preview", use: { ...devices["Desktop Chrome"] }, testMatch: /preview\.spec/ }]
    : [
        { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: /(mobile|preview)\.spec/ },
        { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\.spec/ },
      ],
  webServer: external
    ? undefined
    : {
        command: `npm run build && npx next start -p ${PORT}`,
        url: `http://localhost:${PORT}`,
        timeout: 600_000,
        reuseExistingServer: !process.env.CI,
        env: {
          ...(process.env as Record<string, string>),
          ...dbEnv,
          BETTER_AUTH_URL: `http://localhost:${PORT}`,
          NEXT_PUBLIC_SITE_URL: `http://localhost:${PORT}`,
        },
      },
});
