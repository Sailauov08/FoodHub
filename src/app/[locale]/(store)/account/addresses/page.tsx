import { getTranslations, setRequestLocale } from "next-intl/server";
import { db } from "@/lib/db";
import { requirePageRole } from "@/lib/session";
import { AddressManager } from "@/components/store/address-manager";
import { isPreview } from "@/lib/preview";

export default async function AccountAddresses({ params }: PageProps<"/[locale]/account/addresses">) {
  const { locale } = await params;
  setRequestLocale(locale);
  // Preview mode: the layout shows a setup-required screen; never touch the database here.
  if (isPreview) return null;
  const user = await requirePageRole("ANY", "/account/addresses");
  const t = await getTranslations("account");
  const addresses = await db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] });
  return (
    <section>
      <h2 className="mb-4 font-display text-2xl font-semibold">{t("addresses")}</h2>
      <AddressManager
        addresses={addresses.map((a) => ({
          id: a.id,
          label: a.label,
          street: a.street,
          apartment: a.apartment ?? "",
          entrance: a.entrance ?? "",
          floor: a.floor ?? "",
          notes: a.notes ?? "",
          isDefault: a.isDefault,
        }))}
      />
    </section>
  );
}
