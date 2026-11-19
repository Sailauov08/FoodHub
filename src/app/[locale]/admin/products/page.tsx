import Image from "next/image";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Pencil, Plus, UtensilsCrossed } from "lucide-react";
import { db } from "@/lib/db";
import { getRestaurant } from "@/server/restaurant";
import { formatKzt } from "@/lib/domain/money";
import { pick, type Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { PageHeader, TableWrap } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { AvailabilityToggle, ArchiveProductButton } from "@/components/admin/product-row-actions";
import { isPreview } from "@/lib/preview";

export default async function AdminProducts({ params, searchParams }: PageProps<"/[locale]/admin/products">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const sp = await searchParams;
  const category = typeof sp.category === "string" ? sp.category : undefined;
  const r = await getRestaurant();
  const [categories, products] = await Promise.all([
    db.category.findMany({ where: { restaurantId: r.id }, orderBy: { sortOrder: "asc" } }),
    db.product.findMany({
      where: { restaurantId: r.id, isArchived: false, ...(category ? { category: { slug: category } } : {}) },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { images: { take: 1, orderBy: { sortOrder: "asc" } }, category: true, _count: { select: { variants: { where: { isArchived: false } }, modifierGroups: true } } },
    }),
  ]);

  return (
    <div>
      <PageHeader
        title={t("admin.products")}
        actions={
          <Button asChild>
            <Link href="/admin/products/new">
              <Plus /> {t("admin.newProduct")}
            </Link>
          </Button>
        }
      />
      <nav className="no-scrollbar mb-6 flex gap-2 overflow-x-auto" aria-label={t("admin.categories")}>
        <Link href="/admin/products" className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${!category ? "border-accent bg-accent text-accent-foreground" : "border-border-strong hover:border-accent/60"}`}>
          {t("common.all")}
        </Link>
        {categories.map((c) => (
          <Link key={c.id} href={`/admin/products?category=${c.slug}`} className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold ${category === c.slug ? "border-accent bg-accent text-accent-foreground" : "border-border-strong hover:border-accent/60"}`}>
            {pick(c, "name", locale)}
          </Link>
        ))}
      </nav>
      {products.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th>{t("admin.name")}</th>
              <th>{t("admin.category")}</th>
              <th>{t("admin.price")}</th>
              <th>{t("admin.available")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-[10px] bg-surface-2">
                      {p.images[0] ? <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" /> : null}
                    </div>
                    <div>
                      <p className="font-semibold">{pick(p, "name", locale)}</p>
                      <p className="flex flex-wrap gap-1.5 text-[12px] text-muted">
                        /{p.slug}
                        {p.isFeatured ? <Badge variant="soft">{t("admin.featured")}</Badge> : null}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-muted">{pick(p.category, "name", locale)}</td>
                <td className="font-semibold tabular-nums whitespace-nowrap">{formatKzt(p.price, locale)}</td>
                <td>
                  <AvailabilityToggle id={p.id} isAvailable={p.isAvailable} label={pick(p, "name", locale)} />
                </td>
                <td>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label={t("common.edit")}>
                      <Link href={`/admin/products/${p.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <ArchiveProductButton id={p.id} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState icon={<UtensilsCrossed />} title={t("menu.noResults")} />
      )}
    </div>
  );
}
