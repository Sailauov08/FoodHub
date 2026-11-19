import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { locales } from "@/i18n/config";
import { localizedPath, siteUrl } from "@/lib/site";

export const revalidate = 3600;

/** Public, indexable pages only (no account, checkout, admin or kitchen). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPaths = ["/", "/menu", "/offers", "/about", "/contact"];
  let products: { slug: string; updatedAt: Date }[] = [];
  try {
    products = await db.product.findMany({ where: { isArchived: false, category: { isActive: true } }, select: { slug: true, updatedAt: true } });
  } catch {
    // Database unavailable at build time: emit static pages only.
  }
  const entry = (path: string, lastModified?: Date): MetadataRoute.Sitemap[number] => ({
    url: `${base}${localizedPath(path, "kk")}`,
    lastModified,
    alternates: { languages: Object.fromEntries(locales.map((l) => [l, `${base}${localizedPath(path, l)}`])) },
  });
  return [...staticPaths.map((p) => entry(p)), ...products.map((p) => entry(`/menu/${p.slug}`, p.updatedAt))];
}
