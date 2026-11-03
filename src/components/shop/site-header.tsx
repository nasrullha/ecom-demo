import Link from "next/link";
import { Search, Truck, User } from "lucide-react";
import { getProfile } from "@/lib/auth";
import { getCategories, getSettings } from "@/lib/queries";
import { CartLink } from "@/components/shop/cart-link";
import { MobileMenu } from "@/components/shop/mobile-menu";

/** A small wave glyph used as the logo mark. */
function LogoMark() {
  return (
    <span className="grid size-8 place-items-center rounded-xl bg-ocean text-white shadow-soft" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M3 9c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 3.3-1.8 5-.6" />
        <path d="M3 15c2.2-2.4 4.3-2.4 6.5 0s4.3 2.4 6.5 0 3.3-1.8 5-.6" opacity="0.6" />
      </svg>
    </span>
  );
}

export async function SiteHeader() {
  const [settings, categories, profile] = await Promise.all([
    getSettings(),
    getCategories(),
    getProfile(),
  ]);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-lagoon-deep text-white">
        <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-1.5 text-center text-xs sm:text-[13px]">
          <Truck className="size-3.5 shrink-0 text-gold" aria-hidden />
          <span>
            Delivery to every atoll and island <span className="mx-1 text-white/40">|</span> Pay by bank transfer from any bank
          </span>
        </p>
      </div>

      <div className="glass border-b border-line/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <MobileMenu
            categories={categories.map((c) => ({ name: c.name, slug: c.slug }))}
            signedIn={Boolean(profile)}
            isAdmin={profile?.role === "admin"}
          />

          <Link href="/" className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-lg font-semibold tracking-tight">{settings.store_name}</span>
          </Link>

          {categories.length > 0 ? (
            <nav aria-label="Categories" className="ml-6 hidden items-center gap-1 lg:flex">
              <Link href="/products" className="rounded-full px-3 py-1.5 text-sm font-medium hover:bg-wash">
                Shop all
              </Link>
              {categories.slice(0, 5).map((c) => (
                <Link
                  key={c.id}
                  href={`/category/${c.slug}`}
                  className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-wash hover:text-ink"
                >
                  {c.name}
                </Link>
              ))}
            </nav>
          ) : null}

          <form action="/products" role="search" className="mx-auto hidden w-full max-w-xs md:block">
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                id="site-search"
                name="q"
                type="search"
                maxLength={100}
                placeholder="Search products"
                className="h-10 w-full rounded-full bg-wash pl-10 pr-4 text-sm placeholder:text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </form>

          <nav aria-label="Account" className="ml-auto flex items-center gap-0.5 md:ml-0">
            <Link href="/products" className="rounded-full p-2.5 hover:bg-wash md:hidden" aria-label="Search products">
              <Search className="size-5" aria-hidden />
            </Link>
            <Link
              href={profile ? "/account" : "/login"}
              className="flex items-center gap-2 rounded-full p-2.5 text-sm font-medium hover:bg-wash sm:px-3"
            >
              <User className="size-5" aria-hidden />
              <span className="hidden sm:inline">{profile ? "Account" : "Sign in"}</span>
            </Link>
            {profile?.role === "admin" ? (
              <Link
                href="/admin"
                className="hidden rounded-full bg-gold-soft px-3 py-1.5 text-sm font-medium text-gold-ink hover:bg-gold/30 sm:block"
              >
                Admin
              </Link>
            ) : null}
            <CartLink />
          </nav>
        </div>
      </div>
    </header>
  );
}
