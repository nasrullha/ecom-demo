"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Receipt, Settings, Store, Tags } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/orders", label: "Orders", icon: Receipt },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: Tags },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminNav({ storeName, toReview }: { storeName: string; toReview: number }) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-line bg-surface lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between px-4 pt-3 lg:block lg:px-5 lg:pt-6">
        <p className="font-display text-lg font-semibold">{storeName}</p>
        <p className="text-xs text-muted lg:mt-0.5">Admin</p>
      </div>

      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:px-3 lg:py-5">
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-brand-soft text-brand-strong" : "text-muted hover:bg-wash hover:text-ink"
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {href === "/admin/orders" && toReview > 0 ? (
                <span
                  className="ml-auto rounded-full bg-sky-600 px-1.5 text-xs leading-5 text-white"
                  title={`${toReview} payment slip${toReview === 1 ? "" : "s"} to review`}
                >
                  {toReview}
                </span>
              ) : null}
            </Link>
          );
        })}
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-wash hover:text-ink lg:mt-4"
        >
          <Store className="size-4" aria-hidden />
          View store
        </Link>
      </nav>
    </aside>
  );
}
