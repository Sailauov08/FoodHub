import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { db } from "@/lib/db";
import { DEMO_BLOCKED_AUTH_PATHS, DEMO_BLOCKED_BY_EMAIL_PATHS, isDemoEmail } from "@/lib/demo";

const baseURL = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;

export const auth = betterAuth({
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },
  user: {
    additionalFields: {
      // input: false — clients can never set their own role (no self-registration as staff).
      role: { type: "string", required: false, defaultValue: "CUSTOMER", input: false },
      phone: { type: "string", required: false, input: false },
      locale: { type: "string", required: false, defaultValue: "kk", input: false },
      isDemo: { type: "boolean", required: false, defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: process.env.NODE_ENV === "production" || process.env.AUTH_RATE_LIMIT === "1",
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/change-password": { window: 60, max: 5 },
    },
  },
  advanced: {
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
  },
  hooks: {
    // Public demo accounts share a published password: they must not change credentials or end other
    // visitors' sessions. Enforced here, on the server, not just hidden in the UI.
    before: createAuthMiddleware(async (ctx) => {
      const demoRestricted = new APIError("FORBIDDEN", { message: "DEMO_RESTRICTED", code: "DEMO_RESTRICTED" });
      if ((DEMO_BLOCKED_BY_EMAIL_PATHS as readonly string[]).includes(ctx.path)) {
        const email = (ctx.body as { email?: unknown } | undefined)?.email;
        if (isDemoEmail(email)) throw demoRestricted;
      }
      if ((DEMO_BLOCKED_AUTH_PATHS as readonly string[]).includes(ctx.path)) {
        const session = await getSessionFromCtx(ctx);
        if ((session?.user as { isDemo?: unknown } | undefined)?.isDemo === true) throw demoRestricted;
      }
    }),
  },
  telemetry: { enabled: false },
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
