import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePageRole, STAFF_ROLES } from "@/lib/session";
import { getKitchenOrders } from "@/server/kitchen";
import { KitchenBoard } from "@/components/kitchen/kitchen-board";
import { isPreview } from "@/lib/preview";
import { SetupRequired } from "@/components/setup-required";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[locale]/kitchen">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "kitchen" });
  return { title: t("title"), robots: { index: false, follow: false } };
}

export default async function KitchenPage({ params }: PageProps<"/[locale]/kitchen">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (isPreview) {
    // Empty board (no fixture orders) so the tablet layout can be reviewed; polling and actions are off.
    return (
      <main id="main" className="min-h-dvh bg-background-deep">
        <KitchenBoard initialOrders={[]} role="KITCHEN" userName="" serverTime={new Date().toISOString()} preview>
          <SetupRequired area="kitchen" className="mx-4 mt-4 sm:mx-6" />
        </KitchenBoard>
      </main>
    );
  }
  const user = await requirePageRole(STAFF_ROLES, "/kitchen");
  const orders = await getKitchenOrders({ maskNames: user.isDemo });
  return (
    <main id="main" className="min-h-dvh bg-background-deep">
      <KitchenBoard initialOrders={orders} role={user.role} userName={user.name} serverTime={new Date().toISOString()} />
    </main>
  );
}
