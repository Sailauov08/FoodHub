import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkoutSchema, couponInputSchema, imageUrlSchema, modifierGroupInputSchema, registerSchema } from "@/lib/validation";

const validCheckout = {
  idempotencyKey: "3f1b8c3e-7a0d-4c55-9a51-2b1f2a5c9e01",
  lines: [{ productId: "abc123", variantId: null, modifierOptionIds: [], quantity: 2 }],
  customerName: "Айгерім",
  customerPhone: "8 701 234 56 78",
  customerEmail: "",
  fulfillment: "DELIVERY",
  paymentMethod: "CASH_ON_DELIVERY",
  addressStreet: "Абай даңғылы 10",
  locale: "kk",
};

describe("checkoutSchema", () => {
  it("accepts a valid delivery order and normalizes the phone", () => {
    const r = checkoutSchema.parse(validCheckout);
    expect(r.customerPhone).toBe("+77012345678");
  });

  it("ignores any client-sent price fields", () => {
    const r = checkoutSchema.parse({ ...validCheckout, total: 1, lines: [{ ...validCheckout.lines[0], unitPrice: 1 }] });
    expect(r).not.toHaveProperty("total");
    expect(r.lines[0]).not.toHaveProperty("unitPrice");
  });

  it("requires an address for delivery", () => {
    const r = checkoutSchema.safeParse({ ...validCheckout, addressStreet: "" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.find((i) => i.path[0] === "addressStreet")?.message).toBe("addressRequired");
  });

  it("requires a matching payment method", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, paymentMethod: "PAY_ON_PICKUP" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, fulfillment: "PICKUP", paymentMethod: "PAY_ON_PICKUP", addressStreet: "" }).success).toBe(true);
  });

  it("reports the missing address together with other field errors in one pass", () => {
    const r = checkoutSchema.safeParse({ ...validCheckout, customerPhone: "123", addressStreet: "" });
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("customerPhone");
    expect(paths).toContain("addressStreet");
  });

  it("rejects invalid phones, empty carts, bad quantities and bad keys", () => {
    expect(checkoutSchema.safeParse({ ...validCheckout, customerPhone: "12345" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, lines: [] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, lines: [{ ...validCheckout.lines[0], quantity: 0 }] }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, idempotencyKey: "not-a-uuid" }).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...validCheckout, lines: [{ ...validCheckout.lines[0], productId: "x' OR 1=1" }] }).success).toBe(false);
  });
});

describe("admin schemas", () => {
  it("only allows local or Unsplash images", () => {
    expect(imageUrlSchema.safeParse("/images/products/a.jpg").success).toBe(true);
    expect(imageUrlSchema.safeParse("https://images.unsplash.com/photo-1?w=800").success).toBe(true);
    expect(imageUrlSchema.safeParse("https://evil.example.com/a.jpg").success).toBe(false);
    expect(imageUrlSchema.safeParse("javascript:alert(1)").success).toBe(false);
    expect(imageUrlSchema.safeParse("/images/../../etc/passwd\"").success).toBe(false);
  });

  it("validates coupons", () => {
    const base = { code: "save10", descriptionKk: "a", descriptionRu: "a", descriptionEn: "a", type: "PERCENT", value: 10, minSubtotal: 0, isActive: true, isPublic: false };
    expect(couponInputSchema.parse(base).code).toBe("SAVE10");
    expect(couponInputSchema.safeParse({ ...base, value: 150 }).success).toBe(false);
    expect(couponInputSchema.safeParse({ ...base, startsAt: "2026-12-10", endsAt: "2026-12-01" }).success).toBe(false);
  });

  it("validates modifier group min/max", () => {
    const opt = { nameKk: "a", nameRu: "a", nameEn: "a", price: 0, isAvailable: true };
    expect(modifierGroupInputSchema.safeParse({ nameKk: "g", nameRu: "g", nameEn: "g", minSelect: 2, maxSelect: 1, options: [opt, opt] }).success).toBe(false);
    expect(modifierGroupInputSchema.safeParse({ nameKk: "g", nameRu: "g", nameEn: "g", minSelect: 2, maxSelect: 2, options: [opt] }).success).toBe(false);
    expect(modifierGroupInputSchema.safeParse({ nameKk: "g", nameRu: "g", nameEn: "g", minSelect: 1, maxSelect: 1, options: [opt] }).success).toBe(true);
  });

  it("rejects short passwords at registration", () => {
    expect(registerSchema.safeParse({ name: "Ab", email: "a@b.kz", password: "short" }).success).toBe(false);
  });
});

describe("translations", () => {
  const load = (l: string) => JSON.parse(readFileSync(`messages/${l}.json`, "utf8")) as Record<string, unknown>;
  const flat = (o: Record<string, unknown>, p = ""): string[] =>
    Object.entries(o).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v as Record<string, unknown>, `${p}${k}.`) : [`${p}${k}`]));
  const en = new Set(flat(load("en")));
  for (const locale of ["kk", "ru"]) {
    it(`${locale} has exactly the same keys as en`, () => {
      const keys = new Set(flat(load(locale)));
      expect([...en].filter((k) => !keys.has(k))).toEqual([]);
      expect([...keys].filter((k) => !en.has(k))).toEqual([]);
    });
  }
});
