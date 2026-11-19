export const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "PICKED_UP",
  "CANCELLED",
] as const;
export type OrderStatusValue = (typeof ORDER_STATUSES)[number];
export type Fulfillment = "DELIVERY" | "PICKUP";
export type ActorRole = "CUSTOMER" | "GUEST" | "KITCHEN" | "MANAGER" | "ADMIN";

export const TERMINAL_STATUSES: readonly OrderStatusValue[] = ["DELIVERED", "PICKED_UP", "CANCELLED"];
export const ACTIVE_KITCHEN_STATUSES: readonly OrderStatusValue[] = ["PENDING", "CONFIRMED", "PREPARING", "READY"];

const graph: Record<OrderStatusValue, OrderStatusValue[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "PICKED_UP", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  PICKED_UP: [],
  CANCELLED: [],
};

/** Which roles may perform a given transition. */
function roleMayTransition(role: ActorRole, from: OrderStatusValue, to: OrderStatusValue): boolean {
  if (role === "ADMIN" || role === "MANAGER") return true;
  if (role === "KITCHEN") {
    return (
      (from === "PENDING" && to === "CONFIRMED") ||
      (from === "CONFIRMED" && to === "PREPARING") ||
      (from === "PREPARING" && to === "READY")
    );
  }
  // Customers (and guests holding a tracking token) can only cancel before the restaurant accepts the order.
  return from === "PENDING" && to === "CANCELLED";
}

export type TransitionCheck = { ok: true } | { ok: false; reason: "INVALID_TRANSITION" | "FORBIDDEN" | "WRONG_FULFILLMENT" };

export function canTransition(
  from: OrderStatusValue,
  to: OrderStatusValue,
  fulfillment: Fulfillment,
  role: ActorRole,
): TransitionCheck {
  if (!graph[from].includes(to)) return { ok: false, reason: "INVALID_TRANSITION" };
  if (fulfillment === "PICKUP" && (to === "OUT_FOR_DELIVERY" || to === "DELIVERED"))
    return { ok: false, reason: "WRONG_FULFILLMENT" };
  if (fulfillment === "DELIVERY" && to === "PICKED_UP") return { ok: false, reason: "WRONG_FULFILLMENT" };
  if (!roleMayTransition(role, from, to)) return { ok: false, reason: "FORBIDDEN" };
  return { ok: true };
}

/** Allowed next statuses for UI rendering. */
export function nextStatuses(from: OrderStatusValue, fulfillment: Fulfillment, role: ActorRole): OrderStatusValue[] {
  return graph[from].filter((to) => canTransition(from, to, fulfillment, role).ok);
}

/** The ordered happy-path timeline for a fulfillment type. */
export function timelineFor(fulfillment: Fulfillment): OrderStatusValue[] {
  return fulfillment === "DELIVERY"
    ? ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"]
    : ["PENDING", "CONFIRMED", "PREPARING", "READY", "PICKED_UP"];
}

/** Timestamp column to set when entering a status. */
export function timestampFieldFor(to: OrderStatusValue) {
  switch (to) {
    case "CONFIRMED":
      return "confirmedAt" as const;
    case "PREPARING":
      return "preparingAt" as const;
    case "READY":
      return "readyAt" as const;
    case "DELIVERED":
    case "PICKED_UP":
      return "completedAt" as const;
    case "CANCELLED":
      return "cancelledAt" as const;
    default:
      return null;
  }
}
