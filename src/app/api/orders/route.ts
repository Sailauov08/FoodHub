import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/validation";
import { CheckoutError, createOrder } from "@/server/orders";
import { getSessionUser } from "@/lib/session";
import { handleRouteError, isSameOrigin, jsonError, logInfo } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("FORBIDDEN_ORIGIN", 403);
  try {
    if (!(await rateLimit(`checkout:${clientIp(req.headers)}`, 10, 600))) return jsonError("RATE_LIMITED", 429);
    const input = checkoutSchema.parse(await req.json());
    const user = await getSessionUser();
    const result = await createOrder(input, user);
    if (!result.replay) logInfo("order.created", { orderId: result.orderId, number: result.number });
    return NextResponse.json({ ok: true, ...result }, { status: result.replay ? 200 : 201 });
  } catch (err) {
    if (err instanceof CheckoutError) {
      const status = err.code === "RESTAURANT_CLOSED" ? 423 : err.code === "IDEMPOTENCY_CONFLICT" ? 409 : 422;
      return jsonError(err.code, status, err.details);
    }
    return handleRouteError(err, "orders.create");
  }
}
