import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { Alert, Card } from "@/components/ui";
import { OrderProgress, OrderStatusBadge, OrderTimeline } from "@/components/order-parts";
import { CancelOrderButton } from "@/components/shop/cancel-order-button";
import { SlipUploader } from "@/components/shop/slip-uploader";
import { requireUser } from "@/lib/auth";
import { formatDateTime, formatMoney, STATUS_META } from "@/lib/format";
import { getSettings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/utils";
import type { Order, OrderEvent, OrderItem } from "@/lib/types";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
};

export default async function OrderPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { placed } = await searchParams;
  await requireUser(`/account/orders/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*), order_events(*)")
    .eq("id", id)
    .maybeSingle(); // row-level security: only the owner can read it
  if (!data) notFound();

  const order = data as Order & { order_items: OrderItem[]; order_events: OrderEvent[] };
  const settings = await getSettings();

  let slipUrl: string | null = null;
  if (order.slip_path) {
    const { data: signed } = await supabase.storage.from("payment-slips").createSignedUrl(order.slip_path, 600);
    slipUrl = signed?.signedUrl ?? null;
  }

  const canUpload = order.status === "pending" || order.status === "slip_uploaded";
  const hasBank = Boolean(settings.bank_name || settings.account_number || settings.account_name);

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/account" className="text-muted hover:text-ink">
          &larr; All orders
        </Link>
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      {placed === "1" && order.status === "pending" ? (
        <Alert tone="success" className="mb-6">
          Thank you! Your order is placed and your items are reserved. Transfer the total below, then upload your payment slip.
        </Alert>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-6">
          <Card className="p-5">
            {order.status === "rejected" ? (
              <div className="space-y-1">
                <p className="font-medium text-danger">{STATUS_META.rejected.label}</p>
                {order.admin_note ? <p className="text-sm text-muted">Reason: {order.admin_note}</p> : null}
              </div>
            ) : (
              <>
                <OrderProgress status={order.status} />
                <p className="mt-4 text-center text-sm text-muted">{STATUS_META[order.status].customerHint}</p>
                {order.admin_note ? <p className="mt-2 text-center text-sm">Note from us: {order.admin_note}</p> : null}
              </>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-line">
              {order.order_items.map((item) => {
                const img = productImageUrl(item.image_path);
                return (
                  <li key={item.id} className="flex gap-3 py-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-wash">
                      {img ? (
                        <Image src={img} alt="" fill sizes="64px" className="object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center text-muted/60">
                          <ImageOff className="size-5" aria-hidden />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-muted">
                        {item.variant_name && item.variant_name !== "Default" ? `${item.variant_name} · ` : ""}
                        {formatMoney(item.unit_price)} × {item.quantity}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">{formatMoney(item.line_total)}</p>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Subtotal</dt>
                <dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Shipping</dt>
                <dd className="tabular-nums">{order.shipping_fee === 0 ? "Free" : formatMoney(order.shipping_fee)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-6 sm:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">Delivery</h2>
              <address className="space-y-0.5 text-sm not-italic text-muted">
                <p className="font-medium text-ink">{order.shipping_name}</p>
                <p>{order.shipping_address}</p>
                <p>
                  {order.shipping_city}
                  {order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
                </p>
                <p>{order.shipping_phone}</p>
              </address>
              {order.customer_note ? <p className="mt-3 text-sm text-muted">Your note: {order.customer_note}</p> : null}
            </Card>
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">History</h2>
              <OrderTimeline events={order.order_events} />
              <p className="mt-3 text-xs text-muted">Placed {formatDateTime(order.created_at)}</p>
            </Card>
          </div>
        </div>

        <aside className="space-y-6">
          {canUpload ? (
            <Card className="space-y-4 p-5">
              <h2 className="text-lg font-semibold">Pay by bank transfer</h2>
              <p className="text-sm text-muted">
                Transfer exactly <span className="font-semibold text-ink">{formatMoney(order.total)}</span> and include{" "}
                <span className="font-semibold text-ink">{order.order_number}</span> as the reference.
              </p>
              {hasBank ? (
                <dl className="space-y-2 rounded-lg bg-wash p-3 text-sm">
                  {settings.bank_name ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Bank</dt>
                      <dd className="text-right font-medium">{settings.bank_name}</dd>
                    </div>
                  ) : null}
                  {settings.account_name ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Account name</dt>
                      <dd className="text-right font-medium">{settings.account_name}</dd>
                    </div>
                  ) : null}
                  {settings.account_number ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Account number</dt>
                      <dd className="text-right font-mono font-medium">{settings.account_number}</dd>
                    </div>
                  ) : null}
                </dl>
              ) : (
                <Alert tone="info">Bank details are not set up yet. Please contact the shop for payment details.</Alert>
              )}
              {settings.payment_instructions ? (
                <p className="whitespace-pre-line text-sm text-muted">{settings.payment_instructions}</p>
              ) : null}

              {slipUrl ? (
                <div>
                  <p className="mb-1.5 text-sm font-medium">Your uploaded slip</p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipUrl} alt="Your payment slip" className="max-h-64 w-auto rounded-lg ring-1 ring-line" />
                </div>
              ) : null}

              <SlipUploader orderId={order.id} hasSlip={Boolean(order.slip_path)} />
              {order.status === "pending" ? <CancelOrderButton orderId={order.id} /> : null}
            </Card>
          ) : slipUrl ? (
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">Payment slip</h2>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={slipUrl} alt="Your payment slip" className="max-h-80 w-auto rounded-lg ring-1 ring-line" />
              {order.slip_uploaded_at ? (
                <p className="mt-2 text-xs text-muted">Uploaded {formatDateTime(order.slip_uploaded_at)}</p>
              ) : null}
            </Card>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
