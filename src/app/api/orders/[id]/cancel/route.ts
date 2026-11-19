import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrderForViewer, transitionOrder, TransitionError } from "@/server/orders";
import { getSessionUser } from "@/lib/session";
import { handleRouteError, isSameOrigin, jsonError } from "@/server/http";

const bodySchema = z.object({ token: z.string().max(64).nullable().optional() });

/** Customer-initiated cancellation: allowed only while the order is still PENDING (enforced by the state machine). */
export async function POST(req: Request, ctx: RouteContext<"/api/orders/[id]/cancel">) {
  if (!isSameOrigin(req)) return jsonError("FORBIDDEN_ORIGIN", 403);
  try {
    const { id } = await ctx.params;
    const { token } = bodySchema.parse(await req.json().catch(() => ({})));
    const viewer = await getSessionUser();
    const found = await getOrderForViewer(id, viewer, token ?? null);
    if (!found) return jsonError("NOT_FOUND", 404);
    // Even staff use the customer path here; staff cancel through the dashboards.
    const role = found.access === "owner" ? "CUSTOMER" : "GUEST";
    await transitionOrder({ orderId: id, to: "CANCELLED", actor: { id: viewer?.id ?? null, role }, note: "customer" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TransitionError) return jsonError(err.code, err.code === "NOT_FOUND" ? 404 : 409);
    return handleRouteError(err, "orders.cancel");
  }
}
