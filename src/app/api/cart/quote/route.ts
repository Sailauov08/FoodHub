import { NextResponse } from "next/server";
import { quoteSchema } from "@/lib/validation";
import { quoteCart } from "@/server/orders";
import { getSessionUser } from "@/lib/session";
import { handleRouteError, isSameOrigin, jsonError } from "@/server/http";
import { clientIp, rateLimit } from "@/server/rate-limit";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("FORBIDDEN_ORIGIN", 403);
  try {
    if (!(await rateLimit(`quote:${clientIp(req.headers)}`, 120, 60))) return jsonError("RATE_LIMITED", 429);
    const body = quoteSchema.parse(await req.json());
    const user = await getSessionUser();
    const { quote } = await quoteCart({ ...body, userId: user?.id ?? null, phone: user?.phone ?? null });
    return NextResponse.json({ ok: true, quote });
  } catch (err) {
    return handleRouteError(err, "cart.quote");
  }
}
