"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertUser } from "@/lib/session";
import { addressSchema, profileSchema, type AddressInput } from "@/lib/validation";
import { ActionError, assertNotDemo, runAction } from "@/server/action-result";

const idSchema = z.string().min(1).max(64);

export async function updateProfile(input: z.input<typeof profileSchema>) {
  return runAction("account.profile", async () => {
    const user = await assertUser();
    assertNotDemo(user);
    const data = profileSchema.parse(input);
    await db.user.update({
      where: { id: user.id },
      data: { name: data.name, phone: data.phone || null, locale: data.locale },
    });
    revalidatePath("/[locale]/account", "layout");
  });
}

export async function saveAddress(id: string | null, input: AddressInput) {
  return runAction("account.address.save", async () => {
    const user = await assertUser();
    const data = addressSchema.parse(input);
    await db.$transaction(async (tx) => {
      if (id) {
        // Ownership check: updateMany scoped to the user.
        const res = await tx.address.updateMany({ where: { id: idSchema.parse(id), userId: user.id }, data });
        if (res.count !== 1) throw new ActionError("NOT_FOUND");
      } else {
        const count = await tx.address.count({ where: { userId: user.id } });
        if (count >= 10) throw new ActionError("LIMIT");
        const created = await tx.address.create({ data: { ...data, userId: user.id, isDefault: data.isDefault || count === 0 } });
        id = created.id;
      }
      if (data.isDefault) {
        await tx.address.updateMany({ where: { userId: user.id, id: { not: id! } }, data: { isDefault: false } });
      }
    });
    revalidatePath("/[locale]/account/addresses", "page");
  });
}

export async function deleteAddress(id: string) {
  return runAction("account.address.delete", async () => {
    const user = await assertUser();
    const res = await db.address.deleteMany({ where: { id: idSchema.parse(id), userId: user.id } });
    if (res.count !== 1) throw new ActionError("NOT_FOUND");
    revalidatePath("/[locale]/account/addresses", "page");
  });
}

export async function toggleFavorite(productId: string) {
  return runAction("account.favorite", async () => {
    const user = await assertUser();
    const pid = idSchema.parse(productId);
    const existing = await db.favorite.findUnique({ where: { userId_productId: { userId: user.id, productId: pid } } });
    if (existing) {
      await db.favorite.delete({ where: { userId_productId: { userId: user.id, productId: pid } } });
      revalidatePath("/[locale]/account/favorites", "page");
      return { favorite: false };
    }
    const product = await db.product.findFirst({ where: { id: pid, isArchived: false }, select: { id: true } });
    if (!product) throw new ActionError("NOT_FOUND");
    await db.favorite.create({ data: { userId: user.id, productId: pid } });
    revalidatePath("/[locale]/account/favorites", "page");
    return { favorite: true };
  });
}
