import "server-only";
import { db } from "@/lib/db";
import { isPreview } from "@/lib/preview";

/**
 * Fixed-window rate limiter stored in PostgreSQL, so it works across serverless instances.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  if (isPreview) return true;
  const now = new Date();
  const windowEnd = new Date(now.getTime() + windowSeconds * 1000);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RequestLimit" ("key", "count", "windowEnd")
    VALUES (${key}, 1, ${windowEnd})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RequestLimit"."windowEnd" < ${now} THEN 1 ELSE "RequestLimit"."count" + 1 END,
      "windowEnd" = CASE WHEN "RequestLimit"."windowEnd" < ${now} THEN ${windowEnd} ELSE "RequestLimit"."windowEnd" END
    RETURNING "count"`;
  return (rows[0]?.count ?? 1) <= limit;
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim().slice(0, 64);
  return headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}
