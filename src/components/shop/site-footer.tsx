import Link from "next/link";
import { getCategories, getSettings } from "@/lib/queries";

export async function SiteFooter() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <footer className="relative mt-24 overflow-hidden bg-lagoon-deep text-white">
      <div className="lattice pointer-events-none absolute inset-0 opacity-60 invert" aria-hidden />
      <div className="wave-rule absolute inset-x-0 top-0" aria-hidden />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-display text-2xl font-semibold">{settings.store_name}</p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            Carefully chosen products, delivered to your island. We check every payment by hand so your order is safe.
          </p>
          <p className="mt-5 inline-flex rounded-full border border-gold/40 px-3 py-1 text-xs text-gold">
            Pay from any Maldivian bank
          </p>
        </div>
        <nav aria-label="Shop">
          <p className="text-sm font-semibold text-gold">Shop</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              <Link href="/products" className="hover:text-white">
                All products
              </Link>
            </li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="hover:text-white">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account">
          <p className="text-sm font-semibold text-gold">Your account</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>
              <Link href="/account" className="hover:text-white">
                Orders and tracking
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-white">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                Sign in
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-gold">How delivery works</p>
          <ul className="mt-4 space-y-2.5 text-sm text-white/70">
            <li>Malé region: courier to your door</li>
            <li>Atolls and islands: by scheduled vessel</li>
            <li>We share the vessel name with you</li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-white/10 py-5 text-center text-xs text-white/50">
        &copy; {new Date().getFullYear()} {settings.store_name}. All prices in MVR.
      </div>
    </footer>
  );
}
