import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getRestaurant } from "@/server/restaurant";
import { toDateInput } from "@/server/analytics";
import { PageHeader } from "@/components/admin/ui";
import { CouponManager } from "@/components/admin/coupon-manager";
import { isPreview } from "@/lib/preview";

export default async function AdminCoupons({ params }: PageProps<"/[locale]/admin/coupons">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations("admin");
  const r = await getRestaurant();
  const coupons = await db.coupon.findMany({ where: { restaurantId: r.id }, orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title={t("coupons")} />
      <CouponManager
        coupons={coupons.map((c) => ({
          id: c.id,
          code: c.code,
          descriptionKk: c.descriptionKk,
          descriptionRu: c.descriptionRu,
          descriptionEn: c.descriptionEn,
          type: c.type,
          value: c.value,
          minSubtotal: c.minSubtotal,
          maxDiscount: c.maxDiscount ?? "",
          startsAt: c.startsAt ? toDateInput(c.startsAt) : "",
          endsAt: c.endsAt ? toDateInput(c.endsAt) : "",
          usageLimit: c.usageLimit ?? "",
          perUserLimit: c.perUserLimit ?? "",
          usedCount: c.usedCount,
          isActive: c.isActive,
          isPublic: c.isPublic,
        }))}
      />
    </div>
  );
}
