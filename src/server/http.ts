import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/session";
import { describeError } from "@/lib/db-retry";

/** CSRF defence for JSON route handlers: the Origin header must match the request host. */
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.method === "GET" || req.method === "HEAD";
  try {
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function jsonError(code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: code, ...extra }, { status });
}

/** Maps known errors to safe responses; never leaks stack traces. */
export function handleRouteError(err: unknown, context: string) {
  if (err instanceof AuthError) return jsonError(err.code, err.code === "UNAUTHENTICATED" ? 401 : 403);
  if (err instanceof ZodError) {
    return jsonError("VALIDATION", 422, {
      issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    });
  }
  logError(context, err);
  return jsonError("INTERNAL", 500);
}

export function logInfo(event: string, data: Record<string, unknown>) {
  console.info(JSON.stringify({ level: "info", event, ...data }));
}

export function logError(context: string, err: unknown) {
  console.error(
    JSON.stringify({ level: "error", context, message: describeError(err) }),
  );
}
