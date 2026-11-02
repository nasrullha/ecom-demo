"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, Minus, Plus, ShoppingBag } from "lucide-react";
import { Price } from "@/components/price";
import { Button } from "@/components/ui";
import { useCart } from "@/components/shop/cart-provider";
import { cn } from "@/lib/utils";
import type { Variant } from "@/lib/types";

/** Option pickers (Color, Size...), live price and stock, and the Add to cart button. */
export function ProductPurchase({
  optionNames,
  variants,
  basePrice,
  compareAtPrice,
}: {
  optionNames: string[];
  variants: Variant[];
  basePrice: number;
  compareAtPrice: number | null;
}) {
  const cart = useCart();

  const firstChoice = useMemo(() => variants.find((v) => v.stock > 0) ?? variants[0], [variants]);
  const [selected, setSelected] = useState<Record<string, string>>(firstChoice?.options ?? {});
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const variant = useMemo(
    () =>
      variants.find((v) => optionNames.every((name) => v.options[name] === selected[name])) ??
      (optionNames.length === 0 ? variants[0] : undefined),
    [variants, optionNames, selected]
  );

  const valuesFor = (name: string) => Array.from(new Set(variants.map((v) => v.options[name]).filter(Boolean)));

  // A value is "available" if some in-stock variant has it, given the other current choices.
  const isAvailable = (name: string, value: string) =>
    variants.some(
      (v) =>
        v.stock > 0 &&
        v.options[name] === value &&
        optionNames.every((other) => other === name || v.options[other] === selected[other])
    );

  const choose = (name: string, value: string) => {
    const exact = variants.find(
      (v) => v.options[name] === value && optionNames.every((o) => o === name || v.options[o] === selected[o])
    );
    const fallback = variants.find((v) => v.options[name] === value && v.stock > 0) ?? variants.find((v) => v.options[name] === value);
    const next = exact ?? fallback;
    if (next) setSelected(next.options);
    setQuantity(1);
    setJustAdded(false);
  };

  if (!firstChoice) {
    return <p className="rounded-lg bg-wash px-4 py-3 text-sm text-muted">This product is not available right now.</p>;
  }

  const inCart = variant ? (cart.lines.find((l) => l.variantId === variant.id)?.quantity ?? 0) : 0;
  const maxMore = variant ? Math.max(0, Math.min(99, variant.stock) - inCart) : 0;
  const price = variant ? (variant.price ?? basePrice) : basePrice;
  const soldOut = !variant || variant.stock <= 0;
  const lowStock = variant && variant.stock > 0 && variant.stock <= 5;

  return (
    <div className="space-y-6">
      <div className="text-2xl">
        <Price min={price} compareAt={variant?.price == null ? compareAtPrice : null} />
      </div>

      {optionNames.map((name) => (
        <fieldset key={name}>
          <legend className="mb-2 text-sm font-medium">
            {name}: <span className="font-normal text-muted">{selected[name]}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {valuesFor(name).map((value) => {
              const active = selected[name] === value;
              const available = isAvailable(name, value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => choose(name, value)}
                  aria-pressed={active}
                  className={cn(
                    "min-w-11 rounded-lg px-3.5 py-2 text-sm ring-1 ring-inset transition",
                    active ? "bg-ink text-white ring-ink" : "bg-surface ring-line hover:ring-ink",
                    !available && !active && "text-muted line-through decoration-muted/60"
                  )}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}

      <div aria-live="polite" className="text-sm">
        {!variant ? (
          <span className="text-muted">This combination is not available.</span>
        ) : soldOut ? (
          <span className="font-medium text-danger">Sold out</span>
        ) : lowStock ? (
          <span className="font-medium text-sale">Only {variant.stock} left</span>
        ) : (
          <span className="font-medium text-brand">In stock</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-12 items-center rounded-lg bg-surface ring-1 ring-inset ring-line">
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-l-lg hover:bg-wash disabled:text-muted/50"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            className="flex size-12 items-center justify-center rounded-r-lg hover:bg-wash disabled:text-muted/50"
            onClick={() => setQuantity((q) => Math.min(maxMore, q + 1))}
            disabled={quantity >= maxMore}
            aria-label="Increase quantity"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <Button
          size="lg"
          className="flex-1 sm:flex-none sm:min-w-56"
          disabled={!variant || soldOut || maxMore <= 0}
          onClick={() => {
            if (!variant) return;
            cart.add(variant.id, Math.min(quantity, maxMore));
            setQuantity(1);
            setJustAdded(true);
            window.setTimeout(() => setJustAdded(false), 2500);
          }}
        >
          {justAdded ? <Check className="size-5" aria-hidden /> : <ShoppingBag className="size-5" aria-hidden />}
          {justAdded ? "Added to cart" : soldOut ? "Sold out" : maxMore <= 0 ? "Max in cart" : "Add to cart"}
        </Button>
      </div>

      {inCart > 0 ? (
        <p className="text-sm text-muted">
          {inCart} in your cart.{" "}
          <Link href="/cart" className="font-medium text-brand underline">
            View cart
          </Link>
        </p>
      ) : null}
    </div>
  );
}
