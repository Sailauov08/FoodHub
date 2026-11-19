/**
 * Transient database connection errors (Neon compute waking up, dropped WebSocket/TCP connections).
 * Kept framework-free so it can be unit tested.
 */

const READ_OPERATIONS = new Set(["findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany", "count", "aggregate", "groupBy"]);

/** Only reads are retried: repeating a write could apply it twice. */
export function isRetryableOperation(operation: string): boolean {
  return READ_OPERATIONS.has(operation);
}

export function isTransientConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: unknown; type?: unknown; code?: unknown; cause?: unknown };
  // The Neon serverless driver rejects with a bare WebSocket ErrorEvent (type "error", no message).
  if (e.type === "error" && !e.message) return true;
  if (typeof e.code === "string" && ["P1001", "P1002", "P1017", "ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "EPIPE"].includes(e.code)) return true;
  const msg = typeof e.message === "string" ? e.message : "";
  if (/ErrorEvent|ECONNRESET|ETIMEDOUT|ECONNREFUSED|socket hang up|Connection terminated|Can't reach database server|WebSocket|fetch failed|Server has closed the connection/i.test(msg)) return true;
  return e.cause ? isTransientConnectionError(e.cause) : false;
}

/** Human-readable description for logs (ErrorEvent stringifies to "[object ErrorEvent]"). */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { type?: unknown; message?: unknown; error?: { message?: unknown } };
    if (e.type === "error") return `WebSocket ErrorEvent${typeof e.error?.message === "string" ? `: ${e.error.message}` : ""}`;
    if (typeof e.message === "string") return e.message;
  }
  return String(err);
}

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 250): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i === attempts - 1 || !isTransientConnectionError(err)) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** i));
    }
  }
  throw last;
}
