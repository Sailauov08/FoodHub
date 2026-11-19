import { NextResponse } from "next/server";
import { assertRole, STAFF_ROLES } from "@/lib/session";
import { getKitchenOrders } from "@/server/kitchen";
import { handleRouteError } from "@/server/http";

/** Polled by the kitchen display. The database is the single source of truth. */
export async function GET() {
  try {
    const user = await assertRole(STAFF_ROLES);
    const orders = await getKitchenOrders({ maskNames: user.isDemo });
    return NextResponse.json({ ok: true, orders, serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return handleRouteError(err, "kitchen.orders");
  }
}
