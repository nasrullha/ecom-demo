import { CURRENCY, TIMEZONE } from "@/lib/env";
import type { OrderStatus } from "@/lib/types";

let moneyFormatter: Intl.NumberFormat | null = null;
try {
  moneyFormatter = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY });
} catch {
  moneyFormatter = null; // unknown currency code: fall back to "CODE 12.00"
}

/**
 * Money as shown to customers. Maldivian Rufiyaa is written "MVR 1,250" (no
 * decimals when the amount is whole) or "MVR 1,250.50".
 */
export function formatMoney(value: number | null | undefined): string {
  const n = Number(value ?? 0);
  if (CURRENCY === "MVR") {
    const whole = Math.abs(n - Math.round(n)) < 0.005;
    return `MVR ${n.toLocaleString("en-US", {
      minimumFractionDigits: whole ? 0 : 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return moneyFormatter ? moneyFormatter.format(n) : `${CURRENCY} ${n.toFixed(2)}`;
}

let dateFormatter: Intl.DateTimeFormat;
try {
  dateFormatter = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIMEZONE,
  });
} catch {
  dateFormatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return dateFormatter.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(iso)
  );
}

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "slip_uploaded",
  "approved",
  "delivered",
  "rejected",
];

export const STATUS_META: Record<
  OrderStatus,
  { label: string; badge: string; customerHint: string }
> = {
  pending: {
    label: "Pending payment",
    badge: "bg-amber-100 text-amber-900",
    customerHint: "Transfer the total to our bank account, then upload your payment slip.",
  },
  slip_uploaded: {
    label: "Slip uploaded",
    badge: "bg-sky-100 text-sky-900",
    customerHint: "We received your slip and will check your payment shortly.",
  },
  approved: {
    label: "Approved",
    badge: "bg-emerald-100 text-emerald-900",
    customerHint: "Payment confirmed. We are preparing your order.",
  },
  delivered: {
    label: "Delivered",
    badge: "bg-teal-100 text-teal-900",
    customerHint: "Your order has been delivered. Thank you!",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-red-100 text-red-900",
    customerHint: "This order was rejected or cancelled.",
  },
};
