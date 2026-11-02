"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { placeOrderAction } from "@/actions/orders";
import { Alert, Button, ButtonLink, Card, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { useCart } from "@/components/shop/cart-provider";
import { shippingFor, useCartDetails } from "@/components/shop/use-cart-details";
import { formatMoney } from "@/lib/format";

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
  const [pending, startTransition] = useTransition();

  if (loading) return <div className="h-64 animate-pulse rounded-xl bg-wash" aria-label="Loading checkout" />;
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

        <Card className="space-y-4 p-5">
          <h2 className="text-lg font-semibold">Delivery details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" htmlFor="name">
              <Input id="name" name="name" required maxLength={100} autoComplete="name" defaultValue={defaults.name} />
            </Field>
            <Field label="Phone" htmlFor="phone">
              <Input id="phone" name="phone" type="tel" required maxLength={30} autoComplete="tel" defaultValue={defaults.phone} />
            </Field>
          </div>
          <Field label="Address" htmlFor="address">
            <Input id="address" name="address" required maxLength={300} autoComplete="street-address" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="City or island" htmlFor="city">
              <Input id="city" name="city" required maxLength={100} autoComplete="address-level2" />
            </Field>
            <Field label="Postal code (optional)" htmlFor="postalCode">
              <Input id="postalCode" name="postalCode" maxLength={20} autoComplete="postal-code" />
            </Field>
          </div>
          <Field label="Note for us (optional)" htmlFor="note">
            <Textarea id="note" name="note" maxLength={500} rows={3} />
          </Field>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Payment</h2>
          <p className="mt-1 text-sm text-muted">
            After you place the order, you will see our bank details. Transfer the total, then upload a photo of the
            payment slip on your order page. We keep your items reserved while we wait.
          </p>
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
