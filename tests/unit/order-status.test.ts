import { describe, expect, it } from "vitest";
import { canTransition, nextStatuses, timelineFor, timestampFieldFor } from "@/lib/domain/order-status";

describe("order status machine", () => {
  it("allows the delivery happy path for managers", () => {
    const path = timelineFor("DELIVERY");
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!, "DELIVERY", "MANAGER")).toEqual({ ok: true });
    }
  });

  it("allows the pickup happy path for admins", () => {
    const path = timelineFor("PICKUP");
    expect(path.at(-1)).toBe("PICKED_UP");
    for (let i = 0; i < path.length - 1; i++) {
      expect(canTransition(path[i]!, path[i + 1]!, "PICKUP", "ADMIN")).toEqual({ ok: true });
    }
  });

  it("rejects skipping steps and leaving terminal states", () => {
    expect(canTransition("PENDING", "READY", "DELIVERY", "ADMIN")).toEqual({ ok: false, reason: "INVALID_TRANSITION" });
    expect(canTransition("DELIVERED", "CANCELLED", "DELIVERY", "ADMIN")).toEqual({ ok: false, reason: "INVALID_TRANSITION" });
    expect(canTransition("CANCELLED", "CONFIRMED", "DELIVERY", "ADMIN")).toEqual({ ok: false, reason: "INVALID_TRANSITION" });
  });

  it("rejects transitions that do not match the fulfillment type", () => {
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "PICKUP", "ADMIN")).toEqual({ ok: false, reason: "WRONG_FULFILLMENT" });
    expect(canTransition("READY", "PICKED_UP", "DELIVERY", "ADMIN")).toEqual({ ok: false, reason: "WRONG_FULFILLMENT" });
  });

  it("limits the kitchen to kitchen steps", () => {
    expect(canTransition("PENDING", "CONFIRMED", "DELIVERY", "KITCHEN").ok).toBe(true);
    expect(canTransition("CONFIRMED", "PREPARING", "DELIVERY", "KITCHEN").ok).toBe(true);
    expect(canTransition("PREPARING", "READY", "DELIVERY", "KITCHEN").ok).toBe(true);
    expect(canTransition("READY", "OUT_FOR_DELIVERY", "DELIVERY", "KITCHEN")).toEqual({ ok: false, reason: "FORBIDDEN" });
    expect(canTransition("PENDING", "CANCELLED", "DELIVERY", "KITCHEN")).toEqual({ ok: false, reason: "FORBIDDEN" });
  });

  it("lets customers cancel only pending orders", () => {
    expect(canTransition("PENDING", "CANCELLED", "DELIVERY", "CUSTOMER").ok).toBe(true);
    expect(canTransition("PENDING", "CANCELLED", "PICKUP", "GUEST").ok).toBe(true);
    expect(canTransition("CONFIRMED", "CANCELLED", "DELIVERY", "CUSTOMER")).toEqual({ ok: false, reason: "FORBIDDEN" });
    expect(canTransition("PENDING", "CONFIRMED", "DELIVERY", "CUSTOMER")).toEqual({ ok: false, reason: "FORBIDDEN" });
  });

  it("lists next statuses per role", () => {
    expect(nextStatuses("READY", "DELIVERY", "MANAGER")).toEqual(["OUT_FOR_DELIVERY", "CANCELLED"]);
    expect(nextStatuses("READY", "PICKUP", "MANAGER")).toEqual(["PICKED_UP", "CANCELLED"]);
    expect(nextStatuses("PREPARING", "DELIVERY", "KITCHEN")).toEqual(["READY"]);
    expect(nextStatuses("DELIVERED", "DELIVERY", "ADMIN")).toEqual([]);
  });

  it("maps statuses to timestamp columns", () => {
    expect(timestampFieldFor("CONFIRMED")).toBe("confirmedAt");
    expect(timestampFieldFor("PICKED_UP")).toBe("completedAt");
    expect(timestampFieldFor("OUT_FOR_DELIVERY")).toBeNull();
  });
});
