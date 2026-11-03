import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";
import { DispatchPanel, OrderStatusPanel } from "@/components/admin/order-actions";
import { OrderStatusBadge, OrderTimeline } from "@/components/order-parts";
import { Alert, Card } from "@/components/ui";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/utils";
import type { Order, OrderEvent, OrderItem } from "@/lib/types";

export const metadata: Metadata = { title: "Order" };

type Props = { params: Promise<{ id: string }> };

type OrderWithRelations = Order & {
  order_items: OrderItem[];
  order_events: OrderEvent[];
  profiles: { email: string | null; full_name: string | null } | null;
};

export default async function AdminOrderPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, order_items(*), order_events(*), profiles(email,full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as unknown as OrderWithRelations;

  // Payment slips are private: a link that works for 10 minutes is created for this view only.
  let slipUrl: string | null = null;
  if (order.slip_path) {
    const { data: signed } = await supabase.storage.from("payment-slips").createSignedUrl(order.slip_path, 600);
    slipUrl = signed?.signedUrl ?? null;
  }

  return (
    <div>
      <p className="mb-2 text-sm">
        <Link href="/admin/orders" className="text-muted hover:text-ink">
          &larr; All orders
        </Link>
      </p>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">{order.order_number}</h1>
        <OrderStatusBadge status={order.status} />
        <span className="text-sm text-muted">Placed {formatDateTime(order.created_at)}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Items</h2>
            <ul className="divide-y divide-line">
              {order.order_items.map((item) => {
                const img = productImageUrl(item.image_path);
                return (
                  <li key={item.id} className="flex gap-3 py-3">
                    <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-wash">
                      {img ? (
                        <Image src={img} alt="" fill sizes="56px" className="object-cover" />
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
                        {item.sku ? `SKU ${item.sku} · ` : ""}
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
                <dd className="tabular-nums">{formatMoney(order.shipping_fee)}</dd>
              </div>
              <div className="flex justify-between text-base font-semibold">
                <dt>Total to receive</dt>
                <dd className="tabular-nums">{formatMoney(order.total)}</dd>
              </div>
            </dl>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="p-5">
              <h2 className="mb-2 text-lg font-semibold">Customer and delivery</h2>
              <address className="space-y-0.5 text-sm not-italic">
                <p className="font-medium">{order.shipping_name}</p>
                <p className="text-muted">{order.profiles?.email}</p>
                <p className="mt-2 text-muted">{order.shipping_address}</p>
                <p className="text-muted">
                  {order.shipping_city}
                  {order.shipping_atoll ? `, ${order.shipping_atoll}` : ""}
                  {order.shipping_postal_code ? ` ${order.shipping_postal_code}` : ""}
                </p>
                <p className="mt-1 text-muted">
                  Delivery: {order.delivery_method === "vessel" ? "by vessel" : "by courier"}
                  {order.preferred_vessel ? ` (customer asked for ${order.preferred_vessel})` : ""}
                </p>
                <p className="text-muted">{order.shipping_phone}</p>
              </address>
              {order.customer_note ? (
                <p className="mt-3 rounded-lg bg-wash p-3 text-sm">
                  <span className="font-medium">Customer note: </span>
                  {order.customer_note}
                </p>
              ) : null}
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 text-lg font-semibold">History</h2>
              <OrderTimeline events={order.order_events} />
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Payment slip</h2>
            {slipUrl ? (
              <div className="space-y-2">
                <a href={slipUrl} target="_blank" rel="noopener noreferrer" className="block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slipUrl} alt={`Payment slip for ${order.order_number}`} className="max-h-[28rem] w-full rounded-lg object-contain ring-1 ring-line" />
                </a>
                <p className="text-xs text-muted">
                  Uploaded {formatDateTime(order.slip_uploaded_at)}. Click the image to open it full size. Check that the
                  amount is {formatMoney(order.total)} and the reference is {order.order_number}.
                </p>
              </div>
            ) : order.slip_path ? (
              <Alert>The slip could not be loaded. Refresh the page.</Alert>
            ) : (
              <p className="text-sm text-muted">The customer has not uploaded a slip yet.</p>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Delivery and vessel</h2>
            <DispatchPanel
              orderId={order.id}
              method={order.delivery_method}
              vessel={order.vessel_name ?? ""}
              note={order.dispatch_note ?? ""}
              disabled={order.status === "rejected"}
            />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-lg font-semibold">Update order</h2>
            <OrderStatusPanel orderId={order.id} status={order.status} />
            {order.admin_note ? (
              <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
                Latest note: <span className="text-ink">{order.admin_note}</span>
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}
