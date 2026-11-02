import Link from "next/link";
import { Search, User } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { getCategories, getSettings } from "@/lib/queries";
import { CartLink } from "@/components/shop/cart-link";
import { MobileMenu } from "@/components/shop/mobile-menu";

export async function SiteHeader() {
  const [settings, categories, profile] = await Promise.all([
    getSettings(),
    getCategories(),
    getProfile(),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <MobileMenu
          categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
          signedIn={Boolean(profile)}
          isAdmin={profile?.role === "admin"}
        />

        <Link href="/" className="font-display text-xl font-semibold tracking-tight">
          {settings.store_name}
        </Link>

        <form action="/products" role="search" className="mx-auto hidden w-full max-w-md md:block">
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="site-search"
              name="q"
              type="search"
              maxLength={100}
              placeholder="Search products"
              className="h-10 w-full rounded-lg bg-wash pl-9 pr-3 text-sm placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        </form>

        <nav aria-label="Account" className="ml-auto flex items-center gap-1 md:ml-0">
          <Link
            href="/products"
            className="rounded-lg p-2 hover:bg-wash md:hidden"
            aria-label="Search products"
          >
            <Search className="size-5" aria-hidden />
          </Link>
          <Link
            href={profile ? "/account" : "/login"}
            className="flex items-center gap-2 rounded-lg p-2 text-sm font-medium hover:bg-wash"
          >
            <User className="size-5" aria-hidden />
            <span className="hidden sm:inline">{profile ? "Account" : "Sign in"}</span>
          </Link>
          {profile?.role === "admin" ? (
            <Link href="/admin" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-brand hover:bg-brand-soft sm:block">
              Admin
            </Link>
          ) : null}
          <CartLink />
        </nav>
      </div>

      {categories.length > 0 ? (
        <nav aria-label="Categories" className="hidden border-t border-line md:block">
          <ul className="mx-auto flex max-w-7xl gap-6 overflow-x-auto px-4 text-sm sm:px-6 lg:px-8">
            <li>
              <Link href="/products" className="block py-2.5 font-medium text-ink hover:text-brand">
                All products
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="block py-2.5 text-muted hover:text-brand">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
