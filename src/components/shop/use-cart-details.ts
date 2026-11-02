"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CartLine } from "@/components/shop/cart-provider";

export interface CartDetail {
  variantId: string;
  quantity: number;
  available: boolean;
  productName: string;
  productSlug: string;
  variantName: string;
  unitPrice: number;
  stock: number;
  imagePath: string | null;
}

interface VariantRow {
  id: string;
  name: string;
  price: number | null;
  stock: number;
  is_active: boolean;
  products: {
    name: string;
    slug: string;
    price: number;
    is_active: boolean;
    product_images: { path: string; sort_order: number }[];
  } | null;
}

/**
 * Looks up the CURRENT name, price and stock for what is in the cart.
 * Items that were hidden or deleted since they were added come back as unavailable.
 */
export function useCartDetails(lines: CartLine[], ready: boolean) {
  const [rows, setRows] = useState<Map<string, VariantRow> | null>(null);
  const [failed, setFailed] = useState(false);

  const ids = useMemo(() => lines.map((l) => l.variantId).sort().join(","), [lines]);

  useEffect(() => {
    if (!ready) return;
    if (!ids) {
      setRows(new Map());
      return;
    }
    let cancelled = false;
    setFailed(false);

    const supabase = createClient();
    supabase
      .from("product_variants")
      .select("id,name,price,stock,is_active,products(name,slug,price,is_active,product_images(path,sort_order))")
      .in("id", ids.split(","))
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setFailed(true);
          return;
        }
        const map = new Map<string, VariantRow>();
        for (const row of (data as unknown as VariantRow[]) ?? []) map.set(row.id, row);
        setRows(map);
      });

    return () => {
      cancelled = true;
    };
  }, [ids, ready]);

  const details: CartDetail[] = useMemo(() => {
    if (!rows) return [];
    return lines.map((line) => {
      const row = rows.get(line.variantId);
      const product = row?.products ?? null;
      const available = Boolean(row && row.is_active && product && product.is_active);
      const firstImage = product?.product_images?.length
        ? [...product.product_images].sort((a, b) => a.sort_order - b.sort_order)[0].path
        : null;
      return {
        variantId: line.variantId,
        quantity: line.quantity,
        available,
        productName: product?.name ?? "Unavailable item",
        productSlug: product?.slug ?? "",
        variantName: row?.name ?? "",
        unitPrice: row ? (row.price ?? product?.price ?? 0) : 0,
        stock: row?.stock ?? 0,
        imagePath: firstImage,
      };
    });
  }, [rows, lines]);

  return { details, loading: !ready || (rows === null && !failed), failed };
}

export function shippingFor(
  subtotal: number,
  settings: { shipping_fee: number; free_shipping_threshold: number | null }
): number {
  if (settings.free_shipping_threshold !== null && subtotal >= settings.free_shipping_threshold) return 0;
  return settings.shipping_fee;
}
