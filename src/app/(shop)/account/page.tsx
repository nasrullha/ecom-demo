import Link from "next/link";
import type { Metadata } from "next";
import { logoutAction } from "@/actions/auth";
import { ProfileForm } from "@/components/auth/auth-forms";
import { OrderStatusBadge } from "@/components/order-parts";
import { Button, ButtonLink, Card, EmptyState, PageTitle } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Order } from "@/lib/types";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const profile = await getProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("id,order_number,status,total,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const orders = (data as Pick<Order, "id" | "order_number" | "status" | "total" | "created_at">[] | null) ?? [];

  return (
    <>
      <PageTitle title="My account">
        <form action={logoutAction}>
          <Button type="submit" variant="secondary">
            Sign out
          </Button>
        </form>
      </PageTitle>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="mb-4 text-xl font-semibold">
            Your orders
          </h2>
          {orders.length === 0 ? (
            <EmptyState title="No orders yet" action={<ButtonLink href="/products">Start shopping</ButtonLink>}>
              When you place an order, you can follow it here.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-xl bg-surface ring-1 ring-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-wash/60">
                    <div>
                      <p className="font-medium">{o.order_number}</p>
                      <p className="text-sm text-muted">{formatDateTime(o.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <OrderStatusBadge status={o.status} />
                      <span className="w-24 text-right font-semibold tabular-nums">{formatMoney(o.total)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="mb-4 text-xl font-semibold">
            Your details
          </h2>
          <Card className="p-5">
            <ProfileForm
              email={user.email ?? ""}
              fullName={profile?.full_name ?? ""}
              phone={profile?.phone ?? ""}
            />
          </Card>
        </section>
      </div>
    </>
  );
}
