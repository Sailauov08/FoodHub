import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, ChevronRight, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { formatDate } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { Link } from "@/i18n/navigation";
import { PageHeader, TableWrap } from "@/components/admin/ui";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { RoleSelect } from "@/components/admin/role-select";
import { maskEmail, maskName } from "@/lib/demo";
import { isPreview } from "@/lib/preview";

const PAGE_SIZE = 30;

/** Minimum necessary customer data: name, email, role, join date and order count. */
export default async function AdminCustomers({ params, searchParams }: PageProps<"/[locale]/admin/customers">) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const t = await getTranslations();
  const viewer = await getSessionUser();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const [total, users] = await Promise.all([
    db.user.count(),
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, name: true, email: true, role: true, createdAt: true, _count: { select: { orders: true } } },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isAdmin = viewer?.role === "ADMIN" && !viewer.isDemo;
  const masked = !!viewer?.isDemo;

  return (
    <div>
      <PageHeader title={t("admin.customers")} />
      {users.length ? (
        <TableWrap>
          <thead>
            <tr>
              <th>{t("admin.name")}</th>
              <th>{t("admin.email")}</th>
              <th>{t("admin.joined")}</th>
              <th>{t("admin.ordersCount")}</th>
              <th>{t("admin.role")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{masked ? maskName(u.name) : u.name}</td>
                <td className="text-muted">{masked ? maskEmail(u.email) : u.email}</td>
                <td className="whitespace-nowrap text-muted">{formatDate(u.createdAt, locale)}</td>
                <td>{u._count.orders}</td>
                <td>
                  {isAdmin && u.id !== viewer?.id ? (
                    <RoleSelect userId={u.id} role={u.role} label={u.name} />
                  ) : (
                    <Badge variant={u.role === "CUSTOMER" ? "neutral" : "soft"}>{t(`roles.${u.role}`)}</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
      ) : (
        <EmptyState icon={<Users />} title={t("admin.noCustomers")} />
      )}
      {pages > 1 ? (
        <nav className="mt-6 flex items-center justify-between" aria-label="Pagination">
          <Button asChild variant="outline" size="sm" className={page <= 1 ? "pointer-events-none opacity-40" : ""}>
            <Link href={`/admin/customers?page=${page - 1}`}>
              <ChevronLeft /> {t("common.previous")}
            </Link>
          </Button>
          <span className="text-sm text-muted">{t("common.page", { page, pages })}</span>
          <Button asChild variant="outline" size="sm" className={page >= pages ? "pointer-events-none opacity-40" : ""}>
            <Link href={`/admin/customers?page=${page + 1}`}>
              {t("common.next")} <ChevronRight />
            </Link>
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
