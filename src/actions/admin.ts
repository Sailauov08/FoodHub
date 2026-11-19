"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertRole, MANAGEMENT_ROLES, type SessionUser } from "@/lib/session";
import {
  categoryInputSchema,
  couponInputSchema,
  productInputSchema,
  settingsInputSchema,
  type CategoryInput,
  type CouponInput,
  type ProductInput,
  type SettingsInput,
} from "@/lib/validation";
import { getRestaurant } from "@/server/restaurant";
import { ActionError, assertNotDemo, runAction } from "@/server/action-result";

const idSchema = z.string().min(1).max(64);

async function audit(user: SessionUser, action: string, entity: string, entityId: string | null, meta?: object) {
  await db.auditLog.create({ data: { actorId: user.id, action, entity, entityId, meta: meta ?? undefined } });
}

function revalidateCatalog() {
  revalidatePath("/[locale]", "layout");
}

// ---------- Products ----------

export async function saveProduct(id: string | null, input: ProductInput) {
  return runAction("admin.product.save", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    const data = productInputSchema.parse(input);
    const r = await getRestaurant();
    const category = await db.category.findFirst({ where: { id: data.categoryId, restaurantId: r.id } });
    if (!category) throw new ActionError("CATEGORY_NOT_FOUND");
    if (data.variants.length && !data.variants.some((v) => v.isDefault)) data.variants[0]!.isDefault = true;

    const base = {
      slug: data.slug,
      categoryId: data.categoryId,
      nameKk: data.nameKk,
      nameRu: data.nameRu,
      nameEn: data.nameEn,
      descriptionKk: data.descriptionKk,
      descriptionRu: data.descriptionRu,
      descriptionEn: data.descriptionEn,
      ingredientsKk: data.ingredientsKk || null,
      ingredientsRu: data.ingredientsRu || null,
      ingredientsEn: data.ingredientsEn || null,
      allergens: data.allergens,
      price: data.variants.length ? Math.min(...data.variants.map((v) => v.price)) : data.price,
      compareAtPrice: data.compareAtPrice ?? null,
      weightGrams: data.weightGrams ?? null,
      calories: data.calories ?? null,
      isAvailable: data.isAvailable,
      isFeatured: data.isFeatured,
      maxPerOrder: data.maxPerOrder,
      sortOrder: data.sortOrder,
    };

    const productId = await db.$transaction(async (tx) => {
      let pid: string;
      if (id) {
        const existing = await tx.product.findFirst({ where: { id: idSchema.parse(id), restaurantId: r.id } });
        if (!existing) throw new ActionError("NOT_FOUND");
        pid = existing.id;
        await tx.product.update({ where: { id: pid }, data: base });
      } else {
        pid = (await tx.product.create({ data: { ...base, restaurantId: r.id } })).id;
      }

      // Image (single primary image managed here).
      await tx.productImage.deleteMany({ where: { productId: pid } });
      await tx.productImage.create({ data: { productId: pid, url: data.imageUrl, alt: data.nameEn, sortOrder: 0 } });

      // Variants: update / create; removed variants are archived to keep order history intact.
      const currentVariants = await tx.productVariant.findMany({ where: { productId: pid } });
      const keepVariantIds = new Set<string>();
      for (const [i, v] of data.variants.entries()) {
        const payload = { nameKk: v.nameKk, nameRu: v.nameRu, nameEn: v.nameEn, price: v.price, isDefault: v.isDefault, isAvailable: v.isAvailable, sortOrder: i, isArchived: false };
        const match = v.id ? currentVariants.find((c) => c.id === v.id) : undefined;
        if (match) {
          await tx.productVariant.update({ where: { id: match.id }, data: payload });
          keepVariantIds.add(match.id);
        } else {
          keepVariantIds.add((await tx.productVariant.create({ data: { ...payload, productId: pid } })).id);
        }
      }
      await tx.productVariant.updateMany({
        where: { productId: pid, id: { notIn: [...keepVariantIds] } },
        data: { isArchived: true, isDefault: false },
      });

      // Modifier groups and options.
      const currentGroups = await tx.modifierGroup.findMany({ where: { productId: pid }, include: { options: true } });
      const keepGroupIds = new Set<string>();
      for (const [gi, g] of data.modifierGroups.entries()) {
        const gPayload = { nameKk: g.nameKk, nameRu: g.nameRu, nameEn: g.nameEn, minSelect: g.minSelect, maxSelect: g.maxSelect, sortOrder: gi };
        const gMatch = g.id ? currentGroups.find((c) => c.id === g.id) : undefined;
        const groupId = gMatch
          ? (await tx.modifierGroup.update({ where: { id: gMatch.id }, data: gPayload })).id
          : (await tx.modifierGroup.create({ data: { ...gPayload, productId: pid } })).id;
        keepGroupIds.add(groupId);
        const keepOptionIds = new Set<string>();
        for (const [oi, o] of g.options.entries()) {
          const oPayload = { nameKk: o.nameKk, nameRu: o.nameRu, nameEn: o.nameEn, price: o.price, isAvailable: o.isAvailable, sortOrder: oi, isArchived: false };
          const oMatch = o.id && gMatch ? gMatch.options.find((c) => c.id === o.id) : undefined;
          if (oMatch) {
            await tx.modifierOption.update({ where: { id: oMatch.id }, data: oPayload });
            keepOptionIds.add(oMatch.id);
          } else {
            keepOptionIds.add((await tx.modifierOption.create({ data: { ...oPayload, groupId } })).id);
          }
        }
        await tx.modifierOption.updateMany({ where: { groupId, id: { notIn: [...keepOptionIds] } }, data: { isArchived: true } });
      }
      await tx.modifierGroup.deleteMany({ where: { productId: pid, id: { notIn: [...keepGroupIds] } } });
      return pid;
    });

    await audit(user, id ? "product.update" : "product.create", "Product", productId, { slug: data.slug });
    revalidateCatalog();
    return { id: productId };
  });
}

export async function setProductAvailability(id: string, isAvailable: boolean) {
  return runAction("admin.product.availability", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    const r = await getRestaurant();
    const res = await db.product.updateMany({ where: { id: idSchema.parse(id), restaurantId: r.id }, data: { isAvailable: z.boolean().parse(isAvailable) } });
    if (res.count !== 1) throw new ActionError("NOT_FOUND");
    await audit(user, "product.availability", "Product", id, { isAvailable });
    revalidateCatalog();
  });
}

/** Soft delete: archived products disappear from the menu but stay referenced by past orders. */
export async function archiveProduct(id: string) {
  return runAction("admin.product.archive", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    assertNotDemo(user);
    const r = await getRestaurant();
    const pid = idSchema.parse(id);
    const res = await db.product.updateMany({
      where: { id: pid, restaurantId: r.id },
      data: { isArchived: true, isAvailable: false, isFeatured: false, slug: `archived-${pid}` },
    });
    if (res.count !== 1) throw new ActionError("NOT_FOUND");
    await db.favorite.deleteMany({ where: { productId: pid } });
    await audit(user, "product.archive", "Product", pid);
    revalidateCatalog();
  });
}

// ---------- Categories ----------

export async function saveCategory(id: string | null, input: CategoryInput) {
  return runAction("admin.category.save", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    const data = categoryInputSchema.parse(input);
    const r = await getRestaurant();
    const payload = { ...data, image: data.image || null };
    let cid: string;
    if (id) {
      const res = await db.category.updateMany({ where: { id: idSchema.parse(id), restaurantId: r.id }, data: payload });
      if (res.count !== 1) throw new ActionError("NOT_FOUND");
      cid = id;
    } else {
      cid = (await db.category.create({ data: { ...payload, restaurantId: r.id } })).id;
    }
    await audit(user, id ? "category.update" : "category.create", "Category", cid);
    revalidateCatalog();
    return { id: cid };
  });
}

export async function deleteCategory(id: string) {
  return runAction("admin.category.delete", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    assertNotDemo(user);
    const r = await getRestaurant();
    const cid = idSchema.parse(id);
    const count = await db.product.count({ where: { categoryId: cid } });
    if (count > 0) throw new ActionError("CATEGORY_NOT_EMPTY");
    const res = await db.category.deleteMany({ where: { id: cid, restaurantId: r.id } });
    if (res.count !== 1) throw new ActionError("NOT_FOUND");
    await audit(user, "category.delete", "Category", cid);
    revalidateCatalog();
  });
}

// ---------- Coupons ----------

export async function saveCoupon(id: string | null, input: CouponInput) {
  return runAction("admin.coupon.save", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    const data = couponInputSchema.parse(input);
    const r = await getRestaurant();
    const payload = {
      ...data,
      maxDiscount: data.maxDiscount ?? null,
      startsAt: data.startsAt ?? null,
      endsAt: data.endsAt ?? null,
      usageLimit: data.usageLimit ?? null,
      perUserLimit: data.perUserLimit ?? null,
    };
    let cid: string;
    if (id) {
      const res = await db.coupon.updateMany({ where: { id: idSchema.parse(id), restaurantId: r.id }, data: payload });
      if (res.count !== 1) throw new ActionError("NOT_FOUND");
      cid = id;
    } else {
      cid = (await db.coupon.create({ data: { ...payload, restaurantId: r.id } })).id;
    }
    await audit(user, id ? "coupon.update" : "coupon.create", "Coupon", cid, { code: data.code });
    revalidatePath("/[locale]/admin/coupons", "page");
    revalidatePath("/[locale]/offers", "page");
    return { id: cid };
  });
}

export async function deleteCoupon(id: string) {
  return runAction("admin.coupon.delete", async () => {
    const user = await assertRole(MANAGEMENT_ROLES);
    assertNotDemo(user);
    const r = await getRestaurant();
    const cid = idSchema.parse(id);
    const used = await db.couponRedemption.count({ where: { couponId: cid } });
    if (used > 0) {
      // Keep history: deactivate instead of deleting a coupon that was already redeemed.
      await db.coupon.updateMany({ where: { id: cid, restaurantId: r.id }, data: { isActive: false, isPublic: false } });
    } else {
      const res = await db.coupon.deleteMany({ where: { id: cid, restaurantId: r.id } });
      if (res.count !== 1) throw new ActionError("NOT_FOUND");
    }
    await audit(user, used ? "coupon.deactivate" : "coupon.delete", "Coupon", cid);
    revalidatePath("/[locale]/admin/coupons", "page");
    return { deactivated: used > 0 };
  });
}

// ---------- Settings ----------

export async function saveSettings(input: SettingsInput) {
  return runAction("admin.settings", async () => {
    const user = await assertRole(["ADMIN"]);
    assertNotDemo(user);
    const data = settingsInputSchema.parse(input);
    const r = await getRestaurant();
    await db.restaurantSettings.update({
      where: { restaurantId: r.id },
      data: { ...data, instagram: data.instagram || null, freeDeliveryThreshold: data.freeDeliveryThreshold ?? null },
    });
    await audit(user, "settings.update", "RestaurantSettings", r.id);
    revalidateCatalog();
  });
}

// ---------- Users ----------

const roleSchema = z.enum(["CUSTOMER", "KITCHEN", "MANAGER", "ADMIN"]);

/** Only admins can grant staff roles; an admin cannot demote themselves (prevents lock-out). */
export async function setUserRole(userId: string, role: string) {
  return runAction("admin.user.role", async () => {
    const user = await assertRole(["ADMIN"]);
    assertNotDemo(user);
    const uid = idSchema.parse(userId);
    const newRole = roleSchema.parse(role);
    if (uid === user.id) throw new ActionError("SELF_ROLE_CHANGE");
    await db.user.update({ where: { id: uid }, data: { role: newRole } });
    // Revoke sessions so the new role takes effect immediately.
    await db.session.deleteMany({ where: { userId: uid } });
    await audit(user, "user.role", "User", uid, { role: newRole });
    revalidatePath("/[locale]/admin/customers", "page");
  });
}
