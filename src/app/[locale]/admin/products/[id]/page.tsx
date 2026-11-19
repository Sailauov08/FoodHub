import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { getRestaurant } from "@/server/restaurant";
import { pick, type Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/admin/ui";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { isPreview } from "@/lib/preview";

/** Handles both /admin/products/new and /admin/products/:id. */
export default async function AdminProductEdit({ params }: PageProps<"/[locale]/admin/products/[id]">) {
  const { locale: raw, id } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const r = await getRestaurant();
  const categories = await db.category.findMany({ where: { restaurantId: r.id }, orderBy: { sortOrder: "asc" } });

  let initial: ProductFormValues;
  if (id === "new") {
    initial = {
      slug: "",
      categoryId: categories[0]?.id ?? "",
      nameKk: "",
      nameRu: "",
      nameEn: "",
      descriptionKk: "",
      descriptionRu: "",
      descriptionEn: "",
      ingredientsKk: "",
      ingredientsRu: "",
      ingredientsEn: "",
      allergensCsv: "",
      price: 0,
      compareAtPrice: "",
      weightGrams: "",
      calories: "",
      isAvailable: true,
      isFeatured: false,
      maxPerOrder: 20,
      sortOrder: 100,
      imageUrl: "/images/products/classic-beef-burger.jpg",
      variants: [],
      modifierGroups: [],
    };
  } else {
    const p = await db.product.findFirst({
      where: { id, restaurantId: r.id, isArchived: false },
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 1 },
        variants: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } },
        modifierGroups: { orderBy: { sortOrder: "asc" }, include: { options: { where: { isArchived: false }, orderBy: { sortOrder: "asc" } } } },
      },
    });
    if (!p) notFound();
    initial = {
      slug: p.slug,
      categoryId: p.categoryId,
      nameKk: p.nameKk,
      nameRu: p.nameRu,
      nameEn: p.nameEn,
      descriptionKk: p.descriptionKk,
      descriptionRu: p.descriptionRu,
      descriptionEn: p.descriptionEn,
      ingredientsKk: p.ingredientsKk ?? "",
      ingredientsRu: p.ingredientsRu ?? "",
      ingredientsEn: p.ingredientsEn ?? "",
      allergensCsv: p.allergens.join(", "),
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? "",
      weightGrams: p.weightGrams ?? "",
      calories: p.calories ?? "",
      isAvailable: p.isAvailable,
      isFeatured: p.isFeatured,
      maxPerOrder: p.maxPerOrder,
      sortOrder: p.sortOrder,
      imageUrl: p.images[0]?.url ?? "",
      variants: p.variants.map((v) => ({ id: v.id, nameKk: v.nameKk, nameRu: v.nameRu, nameEn: v.nameEn, price: v.price, isDefault: v.isDefault, isAvailable: v.isAvailable })),
      modifierGroups: p.modifierGroups.map((g) => ({
        id: g.id,
        nameKk: g.nameKk,
        nameRu: g.nameRu,
        nameEn: g.nameEn,
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        options: g.options.map((o) => ({ id: o.id, nameKk: o.nameKk, nameRu: o.nameRu, nameEn: o.nameEn, price: o.price, isAvailable: o.isAvailable })),
      })),
    };
  }

  return (
    <div>
      <Link href="/admin/products" className="inline-flex items-center gap-2 text-sm text-muted hover:text-cream">
        <ArrowLeft className="size-4" /> {t("admin.products")}
      </Link>
      <div className="mt-4">
        <PageHeader title={id === "new" ? t("admin.newProduct") : t("admin.editProduct")} />
      </div>
      <ProductForm id={id === "new" ? null : id} initial={initial} categories={categories.map((c) => ({ id: c.id, name: pick(c, "name", locale) }))} />
    </div>
  );
}
