/**
 * Public demo accounts (portfolio showcase). Their shared password is published on the login page, so they are
 * restricted on the server from account-level and irreversible actions, and they see masked personal data.
 */

export const DEMO_EMAIL_DOMAIN = "foodhub.example.com";

export const DEMO_ACCOUNTS = [
  { role: "ADMIN", email: `admin@${DEMO_EMAIL_DOMAIN}` },
  { role: "MANAGER", email: `manager@${DEMO_EMAIL_DOMAIN}` },
  { role: "KITCHEN", email: `kitchen@${DEMO_EMAIL_DOMAIN}` },
  { role: "CUSTOMER", email: `customer@${DEMO_EMAIL_DOMAIN}` },
] as const;

export function isDemoEmail(email: unknown): boolean {
  return typeof email === "string" && email.trim().toLowerCase().endsWith(`@${DEMO_EMAIL_DOMAIN}`);
}

/** Better Auth endpoints a demo account must never reach (they would lock other visitors out). */
export const DEMO_BLOCKED_AUTH_PATHS = [
  "/change-password",
  "/change-email",
  "/update-user",
  "/delete-user",
  "/revoke-other-sessions",
  "/revoke-sessions",
  "/revoke-session",
  "/link-social",
  "/unlink-account",
] as const;

/** Unauthenticated endpoints that take an email: refuse them for demo addresses. */
export const DEMO_BLOCKED_BY_EMAIL_PATHS = ["/request-password-reset", "/reset-password", "/send-verification-email", "/sign-up/email"] as const;

/** "aigerim.n@mail.kz" → "ai•••@m•••.kz" */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return "";
  const [user = "", domain = ""] = email.split("@");
  const dot = domain.lastIndexOf(".");
  const host = dot > 0 ? domain.slice(0, dot) : domain;
  const tld = dot > 0 ? domain.slice(dot) : "";
  return `${user.slice(0, 2)}•••@${host.slice(0, 1)}•••${tld}`;
}

/** "+77015554433" → "+7 701 ••• •• 33" */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  const m = /^\+7(\d{3})\d{3}\d{2}(\d{2})$/.exec(phone);
  return m ? `+7 ${m[1]} ••• •• ${m[2]}` : "•••";
}

/** "Aigerim Nurlanova" → "Aigerim N." (demo accounts' own names are kept). */
export function maskName(name: string | null | undefined): string {
  if (!name) return "";
  if (/^Demo (Admin|Manager|Kitchen|Customer)$/.test(name)) return name;
  const [first = "", ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0)}.` : first;
}

/** "Abai ave 10, apt 5" → "Abai •••" */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return "";
  const first = address.trim().split(/\s+/)[0] ?? "";
  return `${first} •••`;
}
