import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { AuthError } from "@/lib/session";
import { TransitionError } from "@/server/orders";
import { logError } from "@/server/http";

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Runs a server action body and converts known failures into safe, translatable error codes. */
export async function runAction<T>(context: string, fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.code };
    if (err instanceof TransitionError) return { ok: false, error: err.code };
    if (err instanceof ActionError) return { ok: false, error: err.code };
    if (err instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of err.issues) {
        const key = issue.path.join(".");
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      return { ok: false, error: "VALIDATION", fieldErrors };
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, error: "DUPLICATE" };
    }
    logError(context, err);
    return { ok: false, error: "INTERNAL" };
  }
}

/** Public demo accounts may explore everything except irreversible / account-level changes. */
export function assertNotDemo(user: { isDemo: boolean }) {
  if (user.isDemo) throw new ActionError("DEMO_RESTRICTED");
}

export class ActionError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
