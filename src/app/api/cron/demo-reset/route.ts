import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isPreview } from "@/lib/preview";
import { resetDemoData } from "@/server/demo-reset";
import { handleRouteError, jsonError, logInfo } from "@/server/http";

// Each step is idempotent and only writes what differs from the seed, so a run is normally a few seconds.
export const maxDuration = 60;

/**
 * Daily showcase reset, called by Vercel Cron (see vercel.json) with `Authorization: Bearer $CRON_SECRET`.
 * Disabled unless DEMO_RESET_ENABLED="true": a real restaurant deployment must never run it.
 */
export async function GET(req: Request) {
  if (process.env.DEMO_RESET_ENABLED !== "true" || isPreview) return jsonError("NOT_FOUND", 404);
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return jsonError("NOT_CONFIGURED", 503);
  if (!bearerMatches(req.headers.get("authorization"), secret)) return jsonError("UNAUTHENTICATED", 401);

  try {
    const retentionDays = Number(process.env.DEMO_ORDER_RETENTION_DAYS ?? 7);
    const summary = await resetDemoData(db, { retentionDays: Number.isFinite(retentionDays) && retentionDays >= 1 ? retentionDays : 7 });
    logInfo("demo.reset", summary);
    return NextResponse.json({ ok: true, summary }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err, "demo.reset");
  }
}

function bearerMatches(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
