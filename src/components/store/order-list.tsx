import { getLocale, getTranslations } from "next-intl/server";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/misc";
import { formatDateTime, formatKzt } from "@/lib/domain/money";
import { STATUS_VARIANT } from "@/lib/order-view";
import type { Locale } from "@/i18n/config";

type Row = { id: string; number: string; status: string; total: number; createdAt: Date; fulfillment: string; _count: { items: number } };

export async function OrderList({ orders }: { orders: Row[] }) {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-[20px] border border-border bg-surface">
      {orders.map((o) => (
        <li key={o.id}>
          <Link href={`/orders/${o.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{o.number}</p>
              <p className="text-[13px] text-muted">
                {formatDateTime(o.createdAt, locale)} · {t(`fulfillment.${o.fulfillment}`)} · {t("cart.items", { count: o._count.items })}
              </p>
            </div>
            <Badge variant={STATUS_VARIANT[o.status]}>{t(`status.${o.status}`)}</Badge>
            <span className="hidden w-24 text-right font-semibold tabular-nums sm:block">{formatKzt(o.total, locale)}</span>
            <ChevronRight className="size-4 text-muted-2" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
