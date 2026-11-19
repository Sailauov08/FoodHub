import { NextResponse } from "next/server";
import { getOrderForViewer } from "@/server/orders";
import { getSessionUser } from "@/lib/session";
import { handleRouteError, jsonError } from "@/server/http";

/** Lightweight status endpoint used by the tracking page for polling. */
export async function GET(req: Request, ctx: RouteContext<"/api/orders/[id]">) {
  try {
    const { id } = await ctx.params;
    const token = new URL(req.url).searchParams.get("t");
    const viewer = await getSessionUser();
    const found = await getOrderForViewer(id, viewer, token);
    if (!found) return jsonError("NOT_FOUND", 404);
    const o = found.order;
    return NextResponse.json(
      {
        ok: true,
        status: o.status,
        paymentStatus: o.payment?.status ?? null,
        updatedAt: o.updatedAt,
        history: o.statusHistory.map((h) => ({ to: h.to, at: h.createdAt })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return handleRouteError(err, "orders.status");
  }
}
