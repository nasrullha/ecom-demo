"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export function MobileMenu({
  categories,
  signedIn,
  isAdmin,
}: {
  categories: { name: string; slug: string }[];
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // close the menu after navigating
  useEffect(() => setOpen(false), [pathname]);

  // let Escape close it
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const linkClass = "block rounded-lg px-3 py-2.5 text-base hover:bg-wash";

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="-ml-2 rounded-lg p-2 hover:bg-wash"
        aria-label="Open menu"
        aria-expanded={open}
      >
        <Menu className="size-6" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85%] flex-col overflow-y-auto bg-surface p-4 shadow-xl">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-wash" aria-label="Close menu">
                <X className="size-6" aria-hidden />
              </button>
            </div>
            <nav aria-label="Main">
              <Link href="/products" className={linkClass}>
                All products
              </Link>
              {categories.map((c) => (
                <Link key={c.slug} href={`/category/${c.slug}`} className={`${linkClass} text-muted`}>
                  {c.name}
                </Link>
              ))}
            </nav>
            <div className="mt-4 border-t border-line pt-4">
              <Link href="/cart" className={linkClass}>
                Cart
              </Link>
              {signedIn ? (
                <>
                  <Link href="/account" className={linkClass}>
                    My account
                  </Link>
                  {isAdmin ? (
                    <Link href="/admin" className={`${linkClass} text-brand`}>
                      Admin
                    </Link>
                  ) : null}
                  <form action={logoutAction}>
                    <button type="submit" className={`${linkClass} w-full text-left`}>
                      Sign out
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className={linkClass}>
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
