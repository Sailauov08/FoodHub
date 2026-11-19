import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { redirect } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { isPreview } from "@/lib/preview";

export type AppRole = "CUSTOMER" | "KITCHEN" | "MANAGER" | "ADMIN";
export type SessionUser = { id: string; name: string; email: string; role: AppRole; phone: string | null; isDemo: boolean };

export const STAFF_ROLES: AppRole[] = ["KITCHEN", "MANAGER", "ADMIN"];
export const MANAGEMENT_ROLES: AppRole[] = ["MANAGER", "ADMIN"];

function toRole(value: unknown): AppRole {
  return value === "KITCHEN" || value === "MANAGER" || value === "ADMIN" ? value : "CUSTOMER";
}

/** Server-side session lookup, deduplicated per request. Role is read from the database session payload. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (isPreview) return null;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const u = session.user as typeof session.user & { role?: unknown; phone?: unknown; isDemo?: unknown };
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: toRole(u.role),
    phone: typeof u.phone === "string" ? u.phone : null,
    isDemo: (u as { isDemo?: unknown }).isDemo === true,
  };
});

export class AuthError extends Error {
  constructor(public readonly code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
  }
}

/** For server actions / route handlers: throws instead of redirecting. */
export async function assertRole(roles: AppRole[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  if (!roles.includes(user.role)) throw new AuthError("FORBIDDEN");
  return user;
}

export async function assertUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("UNAUTHENTICATED");
  return user;
}

/** For pages / layouts: redirects to login (or home when the role is insufficient). */
export async function requirePageRole(roles: AppRole[] | "ANY", returnTo: string): Promise<SessionUser> {
  const user = await getSessionUser();
  const locale = await getLocale();
  if (!user) {
    redirect({ href: { pathname: "/login", query: { next: returnTo } }, locale });
    throw new Error("unreachable");
  }
  if (roles !== "ANY" && !roles.includes(user.role)) {
    redirect({ href: "/", locale });
    throw new Error("unreachable");
  }
  return user;
}
