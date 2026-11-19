import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale routing only. Authentication and authorization are enforced server-side
// in layouts, server actions and route handlers (never only here).
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, Next internals and files with an extension (e.g. /images/a.jpg).
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
