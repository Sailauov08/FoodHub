import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { openingHoursSchema, type OpeningHours } from "@/lib/validation";
import { isOpenAt } from "@/lib/domain/hours";
import { isPreview } from "@/lib/preview";
import { previewRestaurant } from "@/server/preview-data";

export const RESTAURANT_SLUG = "foodhub";

export const getRestaurant = cache(async () => {
  if (isPreview) return previewRestaurant;
  const restaurant = await db.restaurant.findUnique({
    where: { slug: RESTAURANT_SLUG },
    include: { settings: true },
  });
  if (!restaurant || !restaurant.settings) {
    throw new Error("Restaurant is not seeded. Run `npm run db:seed`.");
  }
  const parsed = openingHoursSchema.safeParse(restaurant.settings.openingHours);
  const hours: OpeningHours = parsed.success ? parsed.data : defaultHours();
  return { ...restaurant, settings: restaurant.settings, hours };
});

export function defaultHours(): OpeningHours {
  return Array.from({ length: 7 }, (_, day) => ({ day, open: "10:00", close: "23:00", closed: false }));
}

export async function getOrderingState(now = new Date()) {
  const r = await getRestaurant();
  const open = isOpenAt(r.hours, now, r.settings.timezone);
  return { open, accepting: r.settings.acceptingOrders, canOrder: open && r.settings.acceptingOrders };
}
