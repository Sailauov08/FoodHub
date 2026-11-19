import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";

import { NextResponse } from "next/server";
import { isPreview } from "@/lib/preview";

const handlers = toNextJsHandler(auth);

// Preview mode has no database: report "no session" and refuse sign-in/up instead of erroring.
export const GET = isPreview ? async () => NextResponse.json(null) : handlers.GET;
export const POST = isPreview
  ? async () => NextResponse.json({ code: "PREVIEW_MODE", message: "Database not configured" }, { status: 503 })
  : handlers.POST;
