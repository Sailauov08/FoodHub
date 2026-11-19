import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const PRIVATE = ["/api/", "/admin", "/kitchen", "/account", "/checkout", "/cart", "/orders", "/login", "/register"];

export default function robots(): MetadataRoute.Robots {
  const disallow = PRIVATE.flatMap((p) => [p, `/ru${p}`, `/en${p}`]);
  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
