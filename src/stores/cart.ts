"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { z } from "zod";
import { lineKey, MAX_LINE_QUANTITY_HARD_CAP } from "@/lib/domain/pricing";

const localized = z.object({ kk: z.string(), ru: z.string(), en: z.string() });

/**
 * Cart line kept on the client. `snapshot` is display-only (instant render);
 * prices shown at checkout always come from the server quote.
 */
const cartItemSchema = z.object({
  key: z.string().max(400),
  productId: z.string().min(1).max(64),
  variantId: z.string().max(64).nullable(),
  modifierOptionIds: z.array(z.string().max(64)).max(30),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY_HARD_CAP),
  snapshot: z
    .object({
      slug: z.string().max(120),
      name: localized,
      image: z.string().max(500).nullable(),
      variant: localized.nullable(),
      modifiers: z.array(localized).max(30),
      unitPrice: z.number().int().min(0).max(10_000_000),
      maxPerOrder: z.number().int().min(1).max(MAX_LINE_QUANTITY_HARD_CAP),
    })
    .nullable(),
});
export type CartItem = z.infer<typeof cartItemSchema>;

const persistedSchema = z.object({
  items: z.array(cartItemSchema).max(50),
  couponCode: z.string().max(32).nullable(),
  // Account that this local cart is synced with (null = guest cart). Prevents re-merging on every page load.
  ownerId: z.string().max(64).nullable().optional(),
});

type CartState = {
  items: CartItem[];
  couponCode: string | null;
  ownerId: string | null;
  drawerOpen: boolean;
  hydrated: boolean;
  add: (item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  replaceLines: (lines: { productId: string; variantId: string | null; modifierOptionIds: string[]; quantity: number }[]) => void;
  setCoupon: (code: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  setOwner: (ownerId: string | null) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      ownerId: null,
      drawerOpen: false,
      hydrated: false,
      add: (item) => {
        const key = lineKey(item.productId, item.variantId, item.modifierOptionIds);
        const max = Math.min(item.snapshot?.maxPerOrder ?? MAX_LINE_QUANTITY_HARD_CAP, MAX_LINE_QUANTITY_HARD_CAP);
        const items = [...get().items];
        const idx = items.findIndex((i) => i.key === key);
        if (idx >= 0) {
          const current = items[idx]!;
          items[idx] = { ...current, quantity: Math.min(current.quantity + item.quantity, max), snapshot: item.snapshot ?? current.snapshot };
        } else {
          if (items.length >= 50) return;
          items.push({ ...item, key, quantity: Math.min(item.quantity, max) });
        }
        set({ items });
      },
      setQuantity: (key, quantity) => {
        const q = Math.floor(quantity);
        if (!Number.isFinite(q)) return;
        if (q < 1) return get().remove(key);
        set({
          items: get().items.map((i) =>
            i.key === key ? { ...i, quantity: Math.min(q, i.snapshot?.maxPerOrder ?? MAX_LINE_QUANTITY_HARD_CAP, MAX_LINE_QUANTITY_HARD_CAP) } : i,
          ),
        });
      },
      remove: (key) => set({ items: get().items.filter((i) => i.key !== key) }),
      clear: () => set({ items: [], couponCode: null }),
      replaceLines: (lines) => {
        const prev = new Map(get().items.map((i) => [i.key, i]));
        set({
          items: lines.map((l) => {
            const key = lineKey(l.productId, l.variantId, l.modifierOptionIds);
            return { key, ...l, snapshot: prev.get(key)?.snapshot ?? null };
          }),
        });
      },
      setCoupon: (code) => set({ couponCode: code ? code.trim().toUpperCase().slice(0, 32) : null }),
      setDrawerOpen: (open) => set({ drawerOpen: open }),
      setOwner: (ownerId) => set({ ownerId }),
    }),
    {
      name: "foodhub-cart-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ items: s.items, couponCode: s.couponCode, ownerId: s.ownerId }),
      // Never trust localStorage: validate shape, drop the whole persisted state if it is malformed.
      merge: (persisted, current) => {
        const parsed = persistedSchema.safeParse(persisted);
        if (!parsed.success) return current;
        const items = parsed.data.items.map((i) => ({ ...i, key: lineKey(i.productId, i.variantId, i.modifierOptionIds) }));
        return { ...current, items, couponCode: parsed.data.couponCode, ownerId: parsed.data.ownerId ?? null };
      },
      // Rehydrated on the client after mount (see CartHydrator) so SSR and the first client render match.
      skipHydration: true,
    },
  ),
);

export function cartLines(items: CartItem[]) {
  return items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    modifierOptionIds: i.modifierOptionIds,
    quantity: i.quantity,
  }));
}

export function cartCount(items: CartItem[]) {
  return items.reduce((a, i) => a + i.quantity, 0);
}

/** Loads the persisted cart after hydration and marks the store ready. Call once from a client effect. */
export async function hydrateCart() {
  if (useCart.getState().hydrated) return;
  await useCart.persist.rehydrate();
  useCart.setState({ hydrated: true });
}
