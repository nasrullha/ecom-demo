import Link from "next/link";
import { getCategories, getSettings } from "@/lib/queries";

export async function SiteFooter() {
  const [settings, categories] = await Promise.all([getSettings(), getCategories()]);

  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-lg font-semibold">{settings.store_name}</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            Pay by bank transfer and upload your slip. We confirm every payment by hand.
          </p>
        </div>
        <nav aria-label="Shop">
          <p className="text-sm font-semibold">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/products" className="hover:text-ink">
                All products
              </Link>
            </li>
            {categories.slice(0, 6).map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="hover:text-ink">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Account">
          <p className="text-sm font-semibold">Your account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/account" className="hover:text-ink">
                Orders and details
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-ink">
                Cart
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} {settings.store_name}
      </div>
    </footer>
  );
}
