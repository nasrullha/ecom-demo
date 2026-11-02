import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireAdminPage } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Only signed-in admins ever see anything below this line.
  await requireAdminPage();

  const supabase = await createClient();
  const [settings, { count }] = await Promise.all([
    getSettings(),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "slip_uploaded"),
  ]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <AdminNav storeName={settings.store_name} toReview={count ?? 0} />
      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
