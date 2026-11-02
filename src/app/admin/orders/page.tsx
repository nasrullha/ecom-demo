import Link from "next/link";
import type { Metadata } from "next";
import { ExpireOrdersButton } from "@/components/admin/order-actions";
import { OrderStatusBadge } from "@/components/order-parts";
import { Pagination } from "@/components/pagination";
import { EmptyState, Input, PageTitle, Button } from "@/components/ui";
import { formatDateTime, formatMoney, ORDER_STATUSES, STATUS_META } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Order, OrderStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ status?: string; q?: string; page?: string }> };

type Row = Pick<
  Order,
  "id" | "order_number" | "status" | "total" | "shipping_name" | "created_at" | "slip_path"
> & { profiles: { email: string | null } | null };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const sp = await searchParams;
  const status = ORDER_STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N}\s.-]/gu, "").trim().slice(0, 60);
  const page = Math.min(500, Math.max(1, Math.floor(Number(sp.page)) || 1));

  const supabase = await createClient();

  let query = supabase
    .from("orders")
    .select("id,order_number,status,total,shipping_name,created_at,slip_path,profiles(email)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  if (q) query = query.or(`order_number.ilike.%${q}%,shipping_name.ilike.%${q}%`);
  const from = (page - 1) * PAGE_SIZE;

  const [list, counts] = await Promise.all([
    query.range(from, from + PAGE_SIZE - 1),
    Promise.all(
      ORDER_STATUSES.map((s) => supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", s))
    ),
  ]);
  const { data, count } = list;

  const rows = (data as unknown as Row[] | null) ?? [];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const countByStatus = Object.fromEntries(ORDER_STATUSES.map((s, i) => [s, counts[i].count ?? 0])) as Record<OrderStatus, number>;
  const total = ORDER_STATUSES.reduce((sum, s) => sum + countByStatus[s], 0);

  const href = (params: { status?: string; q?: string; page?: number }) => {
    const next = new URLSearchParams();
    if (params.status) next.set("status", params.status);
    if (params.q) next.set("q", params.q);
    if (params.page && params.page > 1) next.set("page", String(params.page));
    const s = next.toString();
    return s ? `/admin/orders?${s}` : "/admin/orders";
  };

  const tab = "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors";

  return (
    <>
      <PageTitle title="Orders">
        <ExpireOrdersButton />
      </PageTitle>

      <nav aria-label="Filter by status" className="mb-4 flex gap-1 overflow-x-auto pb-1">
        <Link href={href({ q })} className={cn(tab, !status ? "bg-ink text-white" : "bg-surface ring-1 ring-inset ring-line hover:bg-wash")}>
          All <span className="opacity-70">{total}</span>
        </Link>
        {ORDER_STATUSES.map((s) => (
          <Link
            key={s}
            href={href({ status: s, q })}
            className={cn(tab, status === s ? "bg-ink text-white" : "bg-surface ring-1 ring-inset ring-line hover:bg-wash")}
          >
            {STATUS_META[s].label} <span className="opacity-70">{countByStatus[s]}</span>
          </Link>
        ))}
      </nav>

      <form action="/admin/orders" role="search" className="mb-5 flex max-w-md gap-2">
        {status ? <input type="hidden" name="status" value={status} /> : null}
        <label htmlFor="order-search" className="sr-only">
          Search orders
        </label>
        <Input id="order-search" name="q" defaultValue={q} placeholder="Order number or customer name" maxLength={60} />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No orders found">Orders will appear here as customers place them.</EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Order</th>
                <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                <th scope="col" className="px-4 py-3 font-medium">Placed</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-wash/50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <p>{o.shipping_name}</p>
                    <p className="text-xs text-muted">{o.profiles?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDateTime(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(o.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={(p) => href({ status, q, page: p })} />
    </>
  );
}
