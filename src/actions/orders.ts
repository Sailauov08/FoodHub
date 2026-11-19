"use server";

import { revalidatePath } from "next/cache";
import { assertRole, STAFF_ROLES } from "@/lib/session";
import { statusUpdateSchema } from "@/lib/validation";
import { transitionOrder } from "@/server/orders";
import { runAction } from "@/server/action-result";
import { logInfo } from "@/server/http";

/** Status changes from the kitchen display and the admin order screens. RBAC is enforced by the state machine. */
export async function updateOrderStatus(input: { orderId: string; to: string; note?: string }) {
  return runAction("orders.status", async () => {
    const user = await assertRole(STAFF_ROLES);
    const data = statusUpdateSchema.parse(input);
    const result = await transitionOrder({
      orderId: data.orderId,
      to: data.to,
      actor: { id: user.id, role: user.role },
      note: data.note,
    });
    logInfo("order.status", { orderId: data.orderId, ...result, actorRole: user.role });
    revalidatePath("/[locale]/admin/orders", "page");
    return result;
  });
}
