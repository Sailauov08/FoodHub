import { defineRouting } from "next-intl/routing";
import { defaultLocale, locales } from "./config";

export const routing = defineRouting({
  locales,
  defaultLocale,
  // Kazakh is the default and is served without a prefix (/menu); /ru/menu and /en/menu for others.
  localePrefix: "as-needed",
  // Default language is Kazakh regardless of browser settings; the user switches explicitly.
  localeDetection: false,
});
