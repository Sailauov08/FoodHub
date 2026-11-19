"use client";

import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { Banknote, Bike, Clock, CreditCard, Loader2, MapPin, ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import { checkoutFormSchema, type CheckoutFormInput } from "@/lib/validation";
import { cartLines, useCart } from "@/stores/cart";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { formatKzt } from "@/lib/domain/money";
import type { Locale } from "@/i18n/config";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { CartLine, CouponForm, SummaryRows, quoteLineFor } from "@/components/store/cart-parts";
import { cn } from "@/lib/utils";

type SavedAddress = { id: string; label: string; street: string; apartment: string; entrance: string; floor: string; notes: string; isDefault: boolean };

export function CheckoutForm({
  user,
  addresses,
  settings,
  canOrder,
  preview = false,
}: {
  user: { name: string; email: string; phone: string | null } | null;
  addresses: SavedAddress[];
  settings: { estimatedDeliveryMin: number; estimatedPickupMin: number };
  canOrder: boolean;
  preview?: boolean;
}) {
  const t = useTranslations();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const items = useCart((s) => s.items);
  const hydrated = useCart((s) => s.hydrated);
  const couponCode = useCart((s) => s.couponCode);
  const clear = useCart((s) => s.clear);
  // One idempotency key per checkout attempt; retries after network errors reuse it.
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);

  const def = addresses.find((a) => a.isDefault) ?? addresses[0];
  const form = useForm<CheckoutFormInput>({
    resolver: zodResolver(checkoutFormSchema),
    mode: "onTouched",
    defaultValues: {
      customerName: user?.name ?? "",
      customerPhone: user?.phone ?? "",
      customerEmail: user?.email ?? "",
      fulfillment: "DELIVERY",
      paymentMethod: "CASH_ON_DELIVERY",
      addressStreet: def?.street ?? "",
      addressApartment: def?.apartment ?? "",
      addressEntrance: def?.entrance ?? "",
      addressFloor: def?.floor ?? "",
      addressNotes: def?.notes ?? "",
      comment: "",
    },
  });
  const { register, handleSubmit, setValue, setError, formState } = form;
  const fulfillment = useWatch({ control: form.control, name: "fulfillment" });
  const { quote, loading } = useCartQuote(fulfillment);
  const fmt = (n: number) => formatKzt(n, locale);
  const err = (name: keyof CheckoutFormInput) => {
    const m = formState.errors[name]?.message;
    return m ? (t.has(`validation.${m}`) ? t(`validation.${m}`) : m) : undefined;
  };

  function chooseFulfillment(f: "DELIVERY" | "PICKUP") {
    setValue("fulfillment", f, { shouldValidate: false });
    setValue("paymentMethod", f === "DELIVERY" ? "CASH_ON_DELIVERY" : "PAY_ON_PICKUP");
  }

  function applyAddress(a: SavedAddress) {
    setValue("addressStreet", a.street, { shouldValidate: true });
    setValue("addressApartment", a.apartment);
    setValue("addressEntrance", a.entrance);
    setValue("addressFloor", a.floor);
    setValue("addressNotes", a.notes);
  }

  async function onSubmit(values: CheckoutFormInput) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, idempotencyKey, lines: cartLines(items), couponCode, locale }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        orderId?: string;
        token?: string;
        error?: string;
        issues?: { path: string; message: string }[];
      };
      if (res.ok && json.ok && json.orderId && json.token) {
        setPlaced(true);
        clear();
        toast.success(t("checkout.successTitle"));
        router.replace(`/orders/${json.orderId}?t=${encodeURIComponent(json.token)}&new=1`);
        return;
      }
      const code = json.error ?? "INTERNAL";
      if (code === "VALIDATION" && json.issues) {
        for (const issue of json.issues) {
          if (issue.path in values) setError(issue.path as keyof CheckoutFormInput, { message: issue.message });
        }
      }
      // A definitive rejection: the next attempt must use a fresh key.
      if (res.status !== 429) setIdempotencyKey(crypto.randomUUID());
      toast.error(t.has(`checkoutErrors.${code}`) ? t(`checkoutErrors.${code}`) : t("checkoutErrors.INTERNAL"));
    } catch {
      // Network failure: keep the same idempotency key so a retry cannot create a duplicate order.
      toast.error(t("common.networkError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_420px]">
        <Skeleton className="h-[640px] w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (items.length === 0 && !placed) {
    return (
      <EmptyState
        className="mt-10"
        icon={<ShoppingBag />}
        title={t("cart.empty")}
        text={t("checkout.emptyRedirect")}
        action={
          <Button asChild>
            <Link href="/menu">{t("cart.browse")}</Link>
          </Button>
        }
      />
    );
  }

  const blocked = !canOrder || !quote || quote.hasInvalidLines || quote.belowMinimum || (!!couponCode && !quote.coupon);

  return (
    <form onSubmit={handleSubmit(onSubmit, () => toast.error(t("checkout.fixErrors")))} noValidate className="mt-10 grid items-start gap-8 lg:grid-cols-[1fr_420px]">
      <div className="space-y-6">
        {!user ? (
          <p className="rounded-[16px] border border-border bg-surface px-5 py-4 text-sm text-muted">
            {t("checkout.guestNote")}{" "}
            <Link href="/login?next=/checkout" className="font-semibold text-accent hover:underline">
              {t("checkout.signIn")}
            </Link>
          </p>
        ) : null}

        <Section title={t("checkout.contact")} step={1}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("checkout.name")} htmlFor="customerName" error={err("customerName")}>
              <Input id="customerName" autoComplete="name" aria-invalid={!!formState.errors.customerName} {...register("customerName")} />
            </Field>
            <Field label={t("checkout.phone")} htmlFor="customerPhone" error={err("customerPhone")} hint={t("checkout.phoneHint")}>
              <Input id="customerPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+7 7__ ___ __ __" aria-invalid={!!formState.errors.customerPhone} {...register("customerPhone")} />
            </Field>
            <Field label={t("checkout.email")} htmlFor="customerEmail" error={err("customerEmail")} optionalLabel={t("common.optional")} className="sm:col-span-2">
              <Input id="customerEmail" type="email" autoComplete="email" aria-invalid={!!formState.errors.customerEmail} {...register("customerEmail")} />
            </Field>
          </div>
        </Section>

        <Section title={t("checkout.fulfillment")} step={2}>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("checkout.fulfillment")}>
            <ChoiceCard active={fulfillment === "DELIVERY"} onClick={() => chooseFulfillment("DELIVERY")} icon={<Bike />} title={t("checkout.delivery")} hint={t("checkout.deliveryHint", { min: settings.estimatedDeliveryMin })} />
            <ChoiceCard active={fulfillment === "PICKUP"} onClick={() => chooseFulfillment("PICKUP")} icon={<Store />} title={t("checkout.pickup")} hint={t("checkout.pickupHint", { min: settings.estimatedPickupMin })} />
          </div>

          {fulfillment === "DELIVERY" ? (
            <div className="mt-6 space-y-4">
              {addresses.length ? (
                <div>
                  <p className="mb-2 text-[13px] font-medium text-muted">{t("checkout.savedAddresses")}</p>
                  <div className="flex flex-wrap gap-2">
                    {addresses.map((a) => (
                      <button key={a.id} type="button" onClick={() => applyAddress(a)} className="flex items-center gap-1.5 rounded-full border border-border-strong px-3.5 py-1.5 text-sm transition-colors hover:border-accent/60">
                        <MapPin className="size-3.5 text-accent" />
                        {a.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <Field label={t("checkout.street")} htmlFor="addressStreet" error={err("addressStreet")}>
                <Input id="addressStreet" autoComplete="street-address" aria-invalid={!!formState.errors.addressStreet} {...register("addressStreet")} />
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label={t("checkout.apartment")} htmlFor="addressApartment" error={err("addressApartment")}>
                  <Input id="addressApartment" {...register("addressApartment")} />
                </Field>
                <Field label={t("checkout.entrance")} htmlFor="addressEntrance" error={err("addressEntrance")}>
                  <Input id="addressEntrance" {...register("addressEntrance")} />
                </Field>
                <Field label={t("checkout.floor")} htmlFor="addressFloor" error={err("addressFloor")}>
                  <Input id="addressFloor" {...register("addressFloor")} />
                </Field>
              </div>
              <Field label={t("checkout.addressNotes")} htmlFor="addressNotes" error={err("addressNotes")} optionalLabel={t("common.optional")}>
                <Input id="addressNotes" {...register("addressNotes")} />
              </Field>
            </div>
          ) : null}
        </Section>

        <Section title={t("checkout.payment")} step={3}>
          <div className="grid gap-3 sm:grid-cols-2">
            {fulfillment === "DELIVERY" ? (
              <ChoiceCard active icon={<Banknote />} title={t("checkout.cash")} hint={t("payment.CASH_ON_DELIVERY")} />
            ) : (
              <ChoiceCard active icon={<Banknote />} title={t("checkout.payOnPickup")} hint={t("checkout.payOnPickupHint")} />
            )}
            <div className="flex items-center gap-3 rounded-[16px] border border-dashed border-border-strong px-4 py-4 text-sm text-muted-2">
              <CreditCard className="size-5 shrink-0" />
              {t("checkout.onlineSoon")}
            </div>
          </div>
          {err("paymentMethod") ? <p className="mt-2 text-[13px] text-danger">{err("paymentMethod")}</p> : null}
          <div className="mt-6">
            <Field label={t("checkout.comment")} htmlFor="comment" error={err("comment")} optionalLabel={t("common.optional")}>
              <Textarea id="comment" rows={3} placeholder={t("checkout.commentPlaceholder")} {...register("comment")} />
            </Field>
          </div>
        </Section>
      </div>

      <aside className="space-y-5 rounded-[24px] border border-border bg-surface p-6 lg:sticky lg:top-28">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold">{t("checkout.summary")}</h2>
          <Link href="/cart" className="inline-flex min-h-9 items-center text-sm font-semibold text-accent hover:underline">
            {t("checkout.editCart")}
          </Link>
        </div>
        <ul className="max-h-[320px] space-y-4 overflow-y-auto pr-1">
          {items.map((item, i) => (
            <CartLine key={item.key} item={item} line={quoteLineFor(quote, items, i)} compact />
          ))}
        </ul>
        <CouponForm />
        <SummaryRows quote={quote} loading={loading} />
        {preview ? (
          <p className="rounded-[12px] bg-warning/10 px-3 py-2 text-[13px] text-warning">{t("checkout.previewDisabled")}</p>
        ) : !canOrder ? (
          <p className="flex items-center gap-2 rounded-[12px] bg-warning/10 px-3 py-2 text-[13px] text-warning">
            <Clock className="size-4" /> {t("checkoutErrors.RESTAURANT_CLOSED")}
          </p>
        ) : null}
        {quote?.hasInvalidLines ? <p className="text-[13px] text-danger">{t("cart.invalidItems")}</p> : null}
        <Button type="submit" size="lg" className="w-full" disabled={blocked || submitting || loading}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" /> {t("checkout.placing")}
            </>
          ) : (
            t("checkout.placeOrder", { total: quote ? fmt(quote.total) : "—" })
          )}
        </Button>
        <p className="text-center text-[12px] text-muted-2">{t("checkout.terms")}</p>
      </aside>
    </form>
  );
}

function Section({ title, step, children }: { title: string; step: number; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-border bg-surface p-5 sm:p-7">
      <h2 className="mb-5 flex items-center gap-3 font-display text-xl font-semibold">
        <span className="grid size-8 place-items-center rounded-full bg-accent-soft font-sans text-sm font-bold text-accent">{step}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function ChoiceCard({ active, onClick, icon, title, hint }: { active: boolean; onClick?: () => void; icon: React.ReactNode; title: string; hint: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 rounded-[16px] border px-4 py-4 text-left transition-colors [&_svg]:size-6",
        active ? "border-accent bg-accent-soft" : "border-border-strong hover:border-accent/50",
      )}
    >
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", active ? "bg-accent text-accent-foreground" : "bg-surface-2 text-cream")}>{icon}</span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
    </button>
  );
}
