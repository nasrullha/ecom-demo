import Link from "next/link";
import type { Metadata } from "next";
import { OrderStatusBadge } from "@/components/order-parts";
import { Alert, Card, PageTitle } from "@/components/ui";
import { formatDateTime, formatMoney, formatShortDate, ORDER_STATUSES } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, Order } from "@/lib/types";

export const metadata: Metadata = { title: "Dashboard" };

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <Card className="h-full p-5 transition-colors hover:bg-wash/50">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [{ data: statsData, error }, { data: recentData }] = await Promise.all([
    supabase.rpc("admin_dashboard_stats"),
    supabase
      .from("orders")
      .select("id,order_number,status,total,shipping_name,created_at")
      .order("created_at", { ascending: false })
      .limit(6),
  ]);

  if (error || !statsData) {
    return (
      <>
        <PageTitle title="Dashboard" />
        <Alert>
          The dashboard could not be loaded. Make sure you ran supabase/schema.sql and that your account has the admin
          role. ({error?.message ?? "no data"})
        </Alert>
      </>
    );
  }

  const stats = statsData as DashboardStats;
  const recent = (recentData as Pick<Order, "id" | "order_number" | "status" | "total" | "shipping_name" | "created_at">[] | null) ?? [];
  const toReview = stats.orders_by_status.slip_uploaded ?? 0;
  const maxRevenue = Math.max(1, ...stats.daily.map((d) => Number(d.revenue)));

  return (
    <>
      <PageTitle title="Dashboard" />

      {toReview > 0 ? (
        <Link
          href="/admin/orders?status=slip_uploaded"
          className="mb-6 flex items-center justify-between rounded-xl bg-sky-100 px-5 py-4 text-sky-950 transition-colors hover:bg-sky-200/70"
        >
          <span className="font-medium">
            {toReview} payment slip{toReview === 1 ? "" : "s"} waiting for your review
          </span>
          <span className="text-sm font-medium underline">Review now</span>
        </Link>
      ) : null}

      <section aria-label="Key numbers" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Revenue, last 30 days" value={formatMoney(stats.revenue_30d)} hint="Approved and delivered orders" />
        <Stat label="Revenue, all time" value={formatMoney(stats.revenue_total)} />
        <Stat label="Orders" value={String(stats.orders_total)} href="/admin/orders" hint={`${stats.orders_by_status.pending ?? 0} awaiting payment`} />
        <Stat label="Customers" value={String(stats.customers_total)} />
        <Stat label="Active products" value={String(stats.products_active)} href="/admin/products" hint={`${stats.products_total} in total`} />
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Revenue, last 14 days</h2>
          <div className="mt-5 flex h-44 items-end gap-1.5" role="img" aria-label={`Daily revenue for the last 14 days. Highest day: ${formatMoney(maxRevenue)}.`}>
            {stats.daily.map((d) => {
              const height = Math.max(2, (Number(d.revenue) / maxRevenue) * 100);
              return (
                <div key={d.date} className="group relative flex h-full flex-1 items-end">
                  <div
                    className="w-full rounded-t bg-brand/80 transition-colors group-hover:bg-brand"
                    style={{ height: `${height}%` }}
                    title={`${formatShortDate(d.date)}: ${formatMoney(Number(d.revenue))} (${d.orders} order${d.orders === 1 ? "" : "s"})`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted">
            <span>{formatShortDate(stats.daily[0].date)}</span>
            <span>{formatShortDate(stats.daily[stats.daily.length - 1].date)}</span>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Orders by status</h2>
          <ul className="mt-4 space-y-2.5">
            {ORDER_STATUSES.map((s) => (
              <li key={s}>
                <Link href={`/admin/orders?status=${s}`} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-wash">
                  <OrderStatusBadge status={s} />
                  <span className="text-sm font-semibold tabular-nums">{stats.orders_by_status[s] ?? 0}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link href="/admin/orders" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-wash/50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{o.order_number}</p>
                      <p className="truncate text-xs text-muted">
                        {o.shipping_name} · {formatDateTime(o.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={o.status} className="hidden sm:inline-flex" />
                      <span className="text-sm font-semibold tabular-nums">{formatMoney(o.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-lg font-semibold">Low stock</h2>
          {stats.low_stock.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Everything is well stocked.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {stats.low_stock.map((item, i) => (
                <li key={`${item.product_id}-${i}`}>
                  <Link href={`/admin/products/${item.product_id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-wash/50">
                    <span className="min-w-0 truncate text-sm">
                      {item.product_name}
                      {item.variant_name !== "Default" ? <span className="text-muted"> · {item.variant_name}</span> : null}
                    </span>
                    <span className={item.stock === 0 ? "text-sm font-semibold text-danger" : "text-sm font-semibold text-sale"}>
                      {item.stock === 0 ? "Sold out" : `${item.stock} left`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
