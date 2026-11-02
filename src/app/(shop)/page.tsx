import Link from "next/link";
import { ArrowRight, Landmark, PackageCheck, ShieldCheck } from "lucide-react";
import { ProductGrid } from "@/components/shop/product-card";
import { getCategories, getFeaturedProducts, getNewestProducts, getSettings } from "@/lib/queries";

export default async function HomePage() {
  const [settings, categories, featured, newest] = await Promise.all([
    getSettings(),
    getCategories(),
    getFeaturedProducts(8),
    getNewestProducts(8),
  ]);

  const picks = featured.length > 0 ? featured : newest;
  const picksTitle = featured.length > 0 ? "Featured" : "New arrivals";

  return (
    <div className="space-y-16">
      <section className="settle pt-4 pb-2 sm:pt-10">
        <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] sm:text-6xl">
          Good things, carefully chosen at {settings.store_name}.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Browse by category, search for exactly what you need, and pay by simple bank transfer.
        </p>

        <form action="/products" role="search" className="mt-8 flex max-w-xl gap-2">
          <label htmlFor="hero-search" className="sr-only">
            Search products
          </label>
          <input
            id="hero-search"
            name="q"
            type="search"
            maxLength={100}
            placeholder="What are you looking for?"
            className="h-12 min-w-0 flex-1 rounded-lg bg-surface px-4 ring-1 ring-inset ring-line placeholder:text-muted/70 focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            className="h-12 rounded-lg bg-brand px-6 font-medium text-white transition-colors hover:bg-brand-strong"
          >
            Search
          </button>
        </form>

        {categories.length > 0 ? (
          <ul className="mt-6 flex flex-wrap gap-2" aria-label="Browse categories">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/category/${c.slug}`}
                  className="inline-block rounded-full bg-surface px-4 py-2 text-sm ring-1 ring-inset ring-line transition-colors hover:bg-ink hover:text-white hover:ring-ink"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section aria-labelledby="picks-heading">
        <div className="mb-5 flex items-end justify-between">
          <h2 id="picks-heading" className="text-2xl font-semibold">
            {picksTitle}
          </h2>
          <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Shop everything <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {picks.length > 0 ? (
          <ProductGrid products={picks} />
        ) : (
          <p className="rounded-xl bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">
            No products yet. Products added in the admin area will appear here.
          </p>
        )}
      </section>

      {featured.length > 0 && newest.length > 0 ? (
        <section aria-labelledby="new-heading">
          <h2 id="new-heading" className="mb-5 text-2xl font-semibold">
            New arrivals
          </h2>
          <ProductGrid products={newest.slice(0, 4)} />
        </section>
      ) : null}

      <section aria-label="How ordering works" className="grid gap-6 rounded-2xl bg-brand-soft p-6 sm:grid-cols-3 sm:p-8">
        {[
          { icon: PackageCheck, title: "Place your order", text: "Choose your items and enter your delivery details. Your stock is reserved right away." },
          { icon: Landmark, title: "Pay by bank transfer", text: "Transfer the total, then upload a photo of your payment slip on your order page." },
          { icon: ShieldCheck, title: "We confirm and deliver", text: "We check your payment, approve the order, and track it until it reaches you." },
        ].map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex gap-3">
            <Icon className="mt-0.5 size-6 shrink-0 text-brand" aria-hidden />
            <div>
              <h3 className="font-sans text-base font-semibold tracking-normal">{title}</h3>
              <p className="mt-1 text-sm text-muted">{text}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
