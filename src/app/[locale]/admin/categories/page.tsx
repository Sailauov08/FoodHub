import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { getRestaurant } from "@/server/restaurant";
import { PageHeader } from "@/components/admin/ui";
import { CategoryManager } from "@/components/admin/category-manager";
import { isPreview } from "@/lib/preview";

export default async function AdminCategories({ params }: PageProps<"/[locale]/admin/categories">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations("admin");
  const r = await getRestaurant();
  const categories = await db.category.findMany({
    where: { restaurantId: r.id },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: { where: { isArchived: false } } } } },
  });
  return (
    <div>
      <PageHeader title={t("categories")} />
      <CategoryManager
        categories={categories.map((c) => ({
          id: c.id,
          slug: c.slug,
          nameKk: c.nameKk,
          nameRu: c.nameRu,
          nameEn: c.nameEn,
          image: c.image ?? "",
          sortOrder: c.sortOrder,
          isActive: c.isActive,
          products: c._count.products,
        }))}
      />
    </div>
  );
}
