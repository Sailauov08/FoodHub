import { z } from "zod";
import { normalizeKzPhone } from "@/lib/domain/phone";

// Error messages are translation keys under the "validation" namespace.

const idSchema = z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);

export const phoneSchema = z
  .string()
  .trim()
  .min(1, "required")
  .transform((v, ctx) => {
    const n = normalizeKzPhone(v);
    if (!n) {
      ctx.addIssue({ code: "custom", message: "phone" });
      return z.NEVER;
    }
    return n;
  });

export const cartLineSchema = z.object({
  productId: idSchema,
  variantId: idSchema.nullable().optional(),
  modifierOptionIds: z.array(idSchema).max(30).default([]),
  quantity: z.number().int().min(1).max(50),
});
export type CartLineDTO = z.infer<typeof cartLineSchema>;

export const cartLinesSchema = z.array(cartLineSchema).max(50);

export const quoteSchema = z.object({
  lines: cartLinesSchema,
  couponCode: z.string().trim().max(32).optional().nullable(),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]).default("DELIVERY"),
});

const checkoutFields = z.object({
  customerName: z.string().trim().min(2, "nameMin").max(80, "tooLong"),
  customerPhone: phoneSchema,
  customerEmail: z.union([z.literal(""), z.email("email")]).optional(),
  fulfillment: z.enum(["DELIVERY", "PICKUP"]),
  paymentMethod: z.enum(["CASH_ON_DELIVERY", "PAY_ON_PICKUP"]),
  addressStreet: z.string().trim().max(200, "tooLong").optional(),
  addressApartment: z.string().trim().max(20, "tooLong").optional(),
  addressEntrance: z.string().trim().max(20, "tooLong").optional(),
  addressFloor: z.string().trim().max(20, "tooLong").optional(),
  addressNotes: z.string().trim().max(300, "tooLong").optional(),
  comment: z.string().trim().max(500, "tooLong").optional(),
});

function refineCheckout(
  v: { fulfillment: "DELIVERY" | "PICKUP"; paymentMethod: string; addressStreet?: string },
  ctx: z.RefinementCtx,
) {
  if (v.fulfillment === "DELIVERY") {
    if (typeof v.addressStreet !== "string" || v.addressStreet.trim().length < 5)
      ctx.addIssue({ code: "custom", path: ["addressStreet"], message: "addressRequired" });
    if (v.paymentMethod !== "CASH_ON_DELIVERY")
      ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "paymentMismatch" });
  } else if (v.paymentMethod !== "PAY_ON_PICKUP") {
    ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "paymentMismatch" });
  }
}

/**
 * Run the cross-field rules even when other fields already failed, so the customer sees every problem
 * (e.g. a missing address together with an invalid phone) after one submit instead of one at a time.
 */
const alwaysRefine = {
  when: (payload: { value: unknown }) => typeof payload.value === "object" && payload.value !== null,
};

/** Client form schema (contact + fulfillment); the API schema below adds cart lines and metadata. */
export const checkoutFormSchema = checkoutFields.superRefine(refineCheckout, alwaysRefine);
export type CheckoutFormInput = z.input<typeof checkoutFormSchema>;

export const checkoutSchema = checkoutFields
  .extend({
    idempotencyKey: z.uuid(),
    lines: cartLinesSchema.min(1, "cartEmpty"),
    couponCode: z.string().trim().max(32).optional().nullable(),
    locale: z.enum(["kk", "ru", "en"]).default("kk"),
  })
  .superRefine(refineCheckout, alwaysRefine);
export type CheckoutInput = z.input<typeof checkoutSchema>;
export type CheckoutData = z.output<typeof checkoutSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(80, "tooLong"),
  email: z.email("email").max(254),
  password: z.string().min(8, "passwordMin").max(128, "tooLong"),
});

export const loginSchema = z.object({
  email: z.email("email"),
  password: z.string().min(1, "required").max(128),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, "nameMin").max(80, "tooLong"),
  phone: z.union([z.literal(""), phoneSchema]).optional(),
  locale: z.enum(["kk", "ru", "en"]),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "required").max(128),
  newPassword: z.string().min(8, "passwordMin").max(128, "tooLong"),
});

export const addressSchema = z.object({
  label: z.string().trim().min(1, "required").max(40, "tooLong"),
  street: z.string().trim().min(5, "addressRequired").max(200, "tooLong"),
  apartment: z.string().trim().max(20, "tooLong").optional(),
  entrance: z.string().trim().max(20, "tooLong").optional(),
  floor: z.string().trim().max(20, "tooLong").optional(),
  notes: z.string().trim().max(300, "tooLong").optional(),
  isDefault: z.boolean(),
});
export type AddressInput = z.infer<typeof addressSchema>;

// ---------- Admin ----------

const money = z.coerce.number().int("integer").min(0, "nonNegative").max(10_000_000, "tooLarge");
const optionalMoney = z.preprocess((v) => (v === "" || v === undefined ? null : v), money.nullable());
const optionalInt = (max: number) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), z.coerce.number().int().min(0).max(max).nullable());
const slug = z
  .string()
  .trim()
  .min(2, "required")
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug");
const localized = (min = 1, max = 120) => z.string().trim().min(min, "required").max(max, "tooLong");

const LOCAL_IMAGE = /^\/images\/[a-zA-Z0-9/_.-]+$/;
const REMOTE_IMAGE = /^https:\/\/images\.unsplash\.com\/[A-Za-z0-9/_.?=&%-]+$/;

/** Only local assets or the explicitly allowed remote host are accepted (matches next.config images). */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500)
  .refine((u) => LOCAL_IMAGE.test(u) || REMOTE_IMAGE.test(u), "imageUrl");

export const variantInputSchema = z.object({
  id: z.string().optional(),
  nameKk: localized(1, 60),
  nameRu: localized(1, 60),
  nameEn: localized(1, 60),
  price: money,
  isDefault: z.boolean(),
  isAvailable: z.boolean(),
});

export const modifierOptionInputSchema = z.object({
  id: z.string().optional(),
  nameKk: localized(1, 60),
  nameRu: localized(1, 60),
  nameEn: localized(1, 60),
  price: money,
  isAvailable: z.boolean(),
});

export const modifierGroupInputSchema = z
  .object({
    id: z.string().optional(),
    nameKk: localized(1, 60),
    nameRu: localized(1, 60),
    nameEn: localized(1, 60),
    minSelect: z.coerce.number().int().min(0).max(10),
    maxSelect: z.coerce.number().int().min(1).max(10),
    options: z.array(modifierOptionInputSchema).min(1, "required").max(20),
  })
  .refine((g) => g.minSelect <= g.maxSelect, { message: "minMax", path: ["maxSelect"] })
  .refine((g) => g.minSelect <= g.options.length, { message: "minMax", path: ["minSelect"] });

export const productInputSchema = z.object({
  slug,
  categoryId: idSchema,
  nameKk: localized(),
  nameRu: localized(),
  nameEn: localized(),
  descriptionKk: localized(1, 1000),
  descriptionRu: localized(1, 1000),
  descriptionEn: localized(1, 1000),
  ingredientsKk: z.string().trim().max(500).optional(),
  ingredientsRu: z.string().trim().max(500).optional(),
  ingredientsEn: z.string().trim().max(500).optional(),
  allergens: z.array(z.string().trim().min(1).max(30)).max(15),
  price: money,
  compareAtPrice: optionalMoney,
  weightGrams: optionalInt(10000),
  calories: optionalInt(10000),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  maxPerOrder: z.coerce.number().int().min(1).max(50),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  imageUrl: imageUrlSchema,
  variants: z.array(variantInputSchema).max(10),
  modifierGroups: z.array(modifierGroupInputSchema).max(10),
});
export type ProductInput = z.input<typeof productInputSchema>;

export const categoryInputSchema = z.object({
  slug,
  nameKk: localized(1, 60),
  nameRu: localized(1, 60),
  nameEn: localized(1, 60),
  image: z.union([z.literal(""), imageUrlSchema]).optional(),
  sortOrder: z.coerce.number().int().min(0).max(10000),
  isActive: z.boolean(),
});
export type CategoryInput = z.input<typeof categoryInputSchema>;

const optionalDate = z.preprocess((v) => (v === "" || v === undefined || v === null ? null : v), z.coerce.date().nullable());
const optionalPositiveInt = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z.coerce.number().int().min(1).nullable(),
);

export const couponInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(3, "required")
      .max(32)
      .regex(/^[A-Z0-9_-]+$/, "couponCode"),
    descriptionKk: localized(1, 200),
    descriptionRu: localized(1, 200),
    descriptionEn: localized(1, 200),
    type: z.enum(["PERCENT", "FIXED"]),
    value: z.coerce.number().int().min(1, "positive").max(10_000_000),
    minSubtotal: money,
    maxDiscount: optionalMoney,
    startsAt: optionalDate,
    endsAt: optionalDate,
    usageLimit: optionalPositiveInt,
    perUserLimit: optionalPositiveInt,
    isActive: z.boolean(),
    isPublic: z.boolean(),
  })
  .refine((c) => c.type !== "PERCENT" || c.value <= 100, { message: "percentMax", path: ["value"] })
  .refine((c) => !c.startsAt || !c.endsAt || c.startsAt < c.endsAt, { message: "dateRange", path: ["endsAt"] });
export type CouponInput = z.input<typeof couponInputSchema>;

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "time");
export const openingHoursSchema = z
  .array(z.object({ day: z.number().int().min(0).max(6), open: hhmm, close: hhmm, closed: z.boolean() }))
  .length(7);
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const settingsInputSchema = z.object({
  phone: phoneSchema,
  email: z.email("email"),
  addressKk: localized(1, 200),
  addressRu: localized(1, 200),
  addressEn: localized(1, 200),
  instagram: z.string().trim().max(60).optional(),
  deliveryFee: money,
  freeDeliveryThreshold: optionalMoney,
  minOrderValue: money,
  estimatedDeliveryMin: z.coerce.number().int().min(5).max(240),
  estimatedPickupMin: z.coerce.number().int().min(5).max(240),
  acceptingOrders: z.boolean(),
  openingHours: openingHoursSchema,
});
export type SettingsInput = z.input<typeof settingsInputSchema>;

export const statusUpdateSchema = z.object({
  orderId: idSchema,
  to: z.enum(["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "PICKED_UP", "CANCELLED"]),
  note: z.string().trim().max(300).optional(),
});
