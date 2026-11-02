"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff, Minus, Plus, Trash2 } from "lucide-react";
import { Alert, ButtonLink, Card, EmptyState } from "@/components/ui";
import { useCart } from "@/components/shop/cart-provider";
import { shippingFor, useCartDetails } from "@/components/shop/use-cart-details";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/utils";

export function CartView({
  shipping,
}: {
  shipping: { shipping_fee: number; free_shipping_threshold: number | null };
}) {
  const cart = useCart();
  const { details, loading, failed } = useCartDetails(cart.lines, cart.ready);

  if (loading) {
    return <div className="h-48 animate-pulse rounded-xl bg-wash" aria-label="Loading your cart" />;
  }
  if (failed) {
    return <Alert>We could not load your cart. Refresh the page to try again.</Alert>;
  }
  if (details.length === 0) {
    return (
      <EmptyState
        title="Your cart is empty"
        action={<ButtonLink href="/products">Start shopping</ButtonLink>}
      >
        Items you add will show up here.
      </EmptyState>
    );
  }

  const purchasable = details.filter((d) => d.available && d.stock > 0);
  const hasProblem = details.some((d) => !d.available || d.quantity > d.stock);
  const subtotal = purchasable.reduce((sum, d) => sum + d.unitPrice * Math.min(d.quantity, d.stock), 0);
  const fee = purchasable.length ? shippingFor(subtotal, shipping) : 0;
  const total = subtotal + fee;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="divide-y divide-line rounded-xl bg-surface ring-1 ring-line">
        {details.map((d) => {
          const img = productImageUrl(d.imagePath);
          const tooMany = d.available && d.quantity > d.stock;
          return (
            <li key={d.variantId} className="flex gap-4 p-4">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-wash">
                {img ? (
                  <Image src={img} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-muted/60">
                    <ImageOff className="size-6" aria-hidden />
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div className="min-w-0">
                    {d.available ? (
                      <Link href={`/products/${d.productSlug}`} className="font-medium hover:underline">
                        {d.productName}
                      </Link>
                    ) : (
                      <p className="font-medium">This item is no longer available</p>
                    )}
                    {d.available && d.variantName && d.variantName !== "Default" ? (
                      <p className="text-sm text-muted">{d.variantName}</p>
                    ) : null}
                  </div>
                  {d.available ? (
                    <p className="font-semibold tabular-nums">{formatMoney(d.unitPrice * d.quantity)}</p>
                  ) : null}
                </div>

                {d.available && d.stock <= 0 ? (
                  <p className="mt-1 text-sm font-medium text-danger">Sold out. Remove it to continue.</p>
                ) : tooMany ? (
                  <p className="mt-1 text-sm font-medium text-sale">Only {d.stock} left. We will order {d.stock}.</p>
                ) : null}

                <div className="mt-auto flex items-center justify-between pt-3">
                  {d.available && d.stock > 0 ? (
                    <div className="flex h-9 items-center rounded-lg ring-1 ring-inset ring-line">
                      <button
                        type="button"
                        className="flex size-9 items-center justify-center rounded-l-lg hover:bg-wash"
                        onClick={() => cart.setQuantity(d.variantId, d.quantity - 1)}
                        aria-label={`Decrease quantity of ${d.productName}`}
                      >
                        <Minus className="size-4" aria-hidden />
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">{Math.min(d.quantity, d.stock)}</span>
                      <button
                        type="button"
                        className="flex size-9 items-center justify-center rounded-r-lg hover:bg-wash disabled:text-muted/40"
                        onClick={() => cart.setQuantity(d.variantId, Math.min(d.quantity + 1, d.stock))}
                        disabled={d.quantity >= d.stock}
                        aria-label={`Increase quantity of ${d.productName}`}
                      >
                        <Plus className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => cart.remove(d.variantId)}
                    className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-muted hover:bg-wash hover:text-danger"
                  >
                    <Trash2 className="size-4" aria-hidden /> Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <Card className="h-fit space-y-3 p-5 lg:sticky lg:top-36">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Shipping</dt>
            <dd className="tabular-nums">{fee === 0 ? "Free" : formatMoney(fee)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatMoney(total)}</dd>
          </div>
        </dl>
        {shipping.free_shipping_threshold !== null && fee > 0 ? (
          <p className="text-xs text-muted">
            Spend {formatMoney(shipping.free_shipping_threshold - subtotal)} more for free shipping.
          </p>
        ) : null}
        {hasProblem ? (
          <Alert tone="info">Remove unavailable items to continue to checkout.</Alert>
        ) : null}
        <ButtonLink
          href={hasProblem || purchasable.length === 0 ? "/cart" : "/checkout"}
          size="lg"
          className={`w-full ${hasProblem || purchasable.length === 0 ? "pointer-events-none opacity-50" : ""}`}
          aria-disabled={hasProblem || purchasable.length === 0}
        >
          Checkout
        </ButtonLink>
        <p className="text-center text-xs text-muted">You pay by bank transfer after placing the order.</p>
      </Card>
    </div>
  );
}
