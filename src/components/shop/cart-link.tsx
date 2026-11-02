"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/components/shop/cart-provider";

export function CartLink() {
  const { count, ready } = useCart();
  const shown = ready ? count : 0;

  return (
    <Link
      href="/cart"
      className="relative rounded-lg p-2 hover:bg-wash"
      aria-label={shown > 0 ? `Cart, ${shown} item${shown === 1 ? "" : "s"}` : "Cart, empty"}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {shown > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold leading-5 text-white">
          {shown > 99 ? "99+" : shown}
        </span>
      ) : null}
    </Link>
  );
}
