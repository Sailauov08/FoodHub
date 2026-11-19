"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { DEMO_ACCOUNTS } from "@/lib/demo";
import { isPreview } from "@/lib/preview";
import { ActionError, runAction } from "@/server/action-result";
import { clientIp, rateLimit } from "@/server/rate-limit";

const roleSchema = z.enum(["ADMIN", "MANAGER", "KITCHEN", "CUSTOMER"]);
const TARGET = { ADMIN: "/admin", MANAGER: "/admin", KITCHEN: "/kitchen", CUSTOMER: "/account" } as const;

/**
 * One-click sign-in / role switch for the public demo accounts.
 * The shared demo password never leaves the server. The current session (if any) is ended first, and a real
 * session for the chosen demo account is created, so every role is enforced by normal server-side RBAC.
 */
export async function demoSignIn(role: string) {
  return runAction("demo.signIn", async () => {
    const password = process.env.DEMO_PASSWORD;
    if (isPreview || !password) throw new ActionError("DEMO_UNAVAILABLE");
    const r = roleSchema.parse(role);
    const account = DEMO_ACCOUNTS.find((a) => a.role === r)!;
    const h = await headers();
    if (!(await rateLimit(`demo-signin:${clientIp(h)}`, 30, 600))) throw new ActionError("RATE_LIMITED");

    const current = await auth.api.getSession({ headers: h });
    if (current) await auth.api.signOut({ headers: h });
    await auth.api.signInEmail({ body: { email: account.email, password }, headers: h });
    return { target: TARGET[r] };
  });
}
