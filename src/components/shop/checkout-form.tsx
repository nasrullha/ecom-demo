"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CreditCard, Landmark, Loader2, Ship, Truck } from "lucide-react";
import { placeOrderAction } from "@/actions/orders";
import { Alert, Button, ButtonLink, Card, EmptyState, Field, Input, Select } from "@/components/ui";
import { useCart } from "@/components/shop/cart-provider";
import { shippingFor, useCartDetails } from "@/components/shop/use-cart-details";
import { formatMoney } from "@/lib/format";
import { ATOLLS, DELIVERY_LABEL, deliveryMethodFor } from "@/lib/maldives";

export function CheckoutForm({
  defaults,
  shipping,
}: {
  defaults: { name: string; phone: string };
  shipping: { shipping_fee: number; free_shipping_threshold: number | null };
}) {
  const router = useRouter();
  const cart = useCart();
  const { details, loading, failed } = useCartDetails(cart.lines, cart.ready);
  const [error, setError] = useState<string | null>(null);
  const [atoll, setAtoll] = useState("");
  const [pending, startTransition] = useTransition();

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-wash" aria-label="Loading checkout" />;
  if (failed) return <Alert>We could not load your cart. Refresh the page to try again.</Alert>;

  const orderable = details.filter((d) => d.available && d.stock > 0);
  if (orderable.length === 0) {
    return (
      <EmptyState title="Your cart is empty" action={<ButtonLink href="/products">Continue shopping</ButtonLink>}>
        Add something to your cart before checking out.
      </EmptyState>
    );
  }
  if (orderable.length !== details.length) {
    return (
      <EmptyState title="Some items are unavailable" action={<ButtonLink href="/cart">Back to cart</ButtonLink>}>
        Remove the unavailable items from your cart, then try again.
      </EmptyState>
    );
  }

  const method = deliveryMethodFor(atoll);
  const lines = orderable.map((d) => ({ ...d, quantity: Math.min(d.quantity, d.stock) }));
  const subtotal = lines.reduce((sum, d) => sum + d.unitPrice * d.quantity, 0);
  const fee = shippingFor(subtotal, shipping);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "");

    startTransition(async () => {
      const result = await placeOrderAction({
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        shipping: {
          name: get("name"),
          phone: get("phone"),
          address: get("address"),
          city: get("city"),
          atoll: get("atoll"),
          deliveryMethod: deliveryMethodFor(get("atoll")),
          vessel: get("vessel") || undefined,
          postalCode: get("postalCode") || undefined,
          note: get("note") || undefined,
        },
      });
      if (!result.ok) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      cart.clear();
      router.push(`/account/orders/${result.orderId}?placed=1`);
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <form onSubmit={onSubmit} className="space-y-6" noValidate={false}>
        {error ? <Alert>{error}</Alert> : null}

        <Card className="space-y-4 p-5 sm:p-6">
          <StepTitle n={1} title="Who is it for?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name">
              <Input id="name" name="name" required maxLength={100} autoComplete="name" defaultValue={defaults.name} />
            </Field>
            <Field label="Mobile number" htmlFor="phone" hint="We call this number if the vessel or courier needs you.">
              <Input id="phone" name="phone" type="tel" required maxLength={30} autoComplete="tel" defaultValue={defaults.phone} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <StepTitle n={2} title="Where should it go?" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Atoll or area" htmlFor="atoll">
              <Select id="atoll" name="atoll" required value={atoll} onChange={(e) => setAtoll(e.target.value)}>
                <option value="" disabled>
                  Choose atoll or area
                </option>
                <optgroup label="Greater Malé">
                  {ATOLLS.filter((a) => a.group === "Greater Malé").map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Atolls">
                  {ATOLLS.filter((a) => a.group === "Atolls").map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            <Field label={method === "vessel" ? "Island" : "Area or ward"} htmlFor="city">
              <Input
                id="city"
                name="city"
                required
                maxLength={100}
                autoComplete="address-level2"
                placeholder={method === "vessel" ? "e.g. Kudahuvadhoo" : "e.g. Henveiru"}
              />
            </Field>
          </div>

          {atoll ? (
            <div
              className={`flex items-start gap-3 rounded-2xl p-4 text-sm ${
                method === "vessel" ? "bg-brand-soft text-brand-strong" : "bg-gold-soft text-gold-ink"
              }`}
            >
              {method === "vessel" ? (
                <Ship className="mt-0.5 size-5 shrink-0" aria-hidden />
              ) : (
                <Truck className="mt-0.5 size-5 shrink-0" aria-hidden />
              )}
              <div>
                <p className="font-semibold">{DELIVERY_LABEL[method]}</p>
                <p className="mt-0.5 opacity-90">
                  {method === "vessel"
                    ? "We send your order by scheduled vessel to your island's jetty. Once it leaves, we tell you the vessel name on your order page."
                    : "Our courier brings your order to your door. We call before arriving."}
                </p>
              </div>
            </div>
          ) : null}

          <Field
            label={method === "vessel" ? "House name, ward and jetty directions" : "Address"}
            htmlFor="address"
            hint={method === "vessel" ? "For example: house name, ward, and who collects at the jetty." : undefined}
          >
            <Input id="address" name="address" required maxLength={300} autoComplete="street-address" />
          </Field>

          {method === "vessel" ? (
            <Field
              label="Vessel or boat name (optional)"
              htmlFor="vessel"
              hint="If you already use a regular boat to your island, tell us its name and we will try to use it."
            >
              <Input id="vessel" name="vessel" maxLength={100} placeholder="e.g. Dhoni Hiyaa" />
            </Field>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Postal code (optional)" htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" maxLength={20} autoComplete="postal-code" />
            </Field>
            <Field label="Note for us (optional)" htmlFor="note">
              <Input id="note" name="note" maxLength={500} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4 p-5 sm:p-6">
          <StepTitle n={3} title="How will you pay?" />
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-2 ring-brand">
            <input type="radio" name="paymentMethod" value="bank_transfer" defaultChecked className="mt-1 size-4 accent-brand" />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-semibold">
                <Landmark className="size-4 text-brand" aria-hidden />
                Bank transfer from any bank
              </span>
              <span className="mt-1 block text-sm text-muted">
                After you place the order you will see our account details and your order reference. Transfer the total
                from your own bank's app or internet banking (any bank in the Maldives works), then upload a photo of the receipt on your order page. We keep your
                items reserved while we wait.
              </span>
            </span>
          </label>
          <div className="flex items-start gap-3 rounded-2xl bg-wash p-4 opacity-70" aria-disabled>
            <input type="radio" disabled className="mt-1 size-4" aria-label="Card payment, coming soon" />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-semibold">
                <CreditCard className="size-4" aria-hidden />
                Card or mobile wallet
                <span className="rounded-full bg-gold-soft px-2 py-0.5 text-[11px] font-medium text-gold-ink">Coming soon</span>
              </span>
              <span className="mt-1 block text-sm text-muted">Pay instantly by card. Not available yet.</span>
            </span>
          </div>
        </Card>

        <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pending}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {pending ? "Placing order…" : `Place order · ${formatMoney(subtotal + fee)}`}
        </Button>
      </form>

      <Card className="h-fit p-5 lg:sticky lg:top-36">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="mt-3 divide-y divide-line text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate">{l.productName}</span>
                <span className="text-muted">
                  {l.variantName && l.variantName !== "Default" ? `${l.variantName} · ` : ""}Qty {l.quantity}
                </span>
              </span>
              <span className="tabular-nums">{formatMoney(l.unitPrice * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd className="tabular-nums">{fee === 0 ? "Free" : formatMoney(fee)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(subtotal + fee)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted">
          The final price is confirmed by our server when you place the order.{" "}
          <Link href="/cart" className="underline">
            Edit cart
          </Link>
        </p>
      </Card>
    </div>
  );
}

function StepTitle({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="flex items-center gap-3 text-lg font-semibold">
      <span className="grid size-7 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{n}</span>
      {title}
    </h2>
  );
}
