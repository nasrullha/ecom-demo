import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Armchair,
  Footprints,
  Gem,
  Glasses,
  Headphones,
  Landmark,
  PackageCheck,
  Search,
  Shirt,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Ship,
  Truck,
  Watch,
  type LucideIcon,
} from "lucide-react";
import { ProductGrid } from "@/components/shop/product-card";
import { getCategories, getFeaturedProducts, getNewestProducts, getSettings } from "@/lib/queries";
import { formatMoney } from "@/lib/format";
import { productImageUrl } from "@/lib/utils";
import type { ProductCardData } from "@/lib/types";

// Pick an icon for a category from its name, so new categories still look intentional.
function iconFor(name: string): LucideIcon {
  const n = name.toLowerCase();
  if (/(cloth|apparel|fashion|wear|shirt)/.test(n)) return Shirt;
  if (/(shoe|foot|sneaker|boot)/.test(n)) return Footprints;
  if (/(access|glass|jewel)/.test(n)) return n.includes("jewel") ? Gem : Glasses;
  if (/(home|living|furnit|decor)/.test(n)) return Armchair;
  if (/(electr|tech|audio|phone|gadget)/.test(n)) return Headphones;
  if (/(beauty|care|skin|cosmetic)/.test(n)) return Sparkles;
  if (/(watch)/.test(n)) return Watch;
  return ShoppingBag;
}

const TILE_BACKGROUNDS = ["bg-ocean", "bg-sunset", "bg-sand", "bg-reef"];

function HeroCollage({ items }: { items: ProductCardData[] }) {
  const slots = [
    { cls: "left-0 top-[8%] w-[56%] [--r:-4deg]", delay: "0s" },
    { cls: "right-0 top-0 w-[48%] [--r:5deg]", delay: "1.2s" },
    { cls: "left-[24%] bottom-0 w-[54%] [--r:2deg]", delay: "2.4s" },
  ];
  return (
    <div className="relative mx-auto aspect-[1/1.05] w-full max-w-[460px]" aria-hidden={items.length === 0}>
      <div className="absolute inset-[6%] rounded-full bg-ocean opacity-[0.12] blur-3xl" />
      {slots.map((slot, i) => {
        const p = items[i];
        const img = p ? productImageUrl(p.image_path) : null;
        return (
          <Link
            key={i}
            href={p ? `/products/${p.slug}` : "/products"}
            tabIndex={p ? 0 : -1}
            style={{ animationDelay: slot.delay }}
            className={`drift absolute rounded-[28px] bg-white p-2 shadow-lift ring-1 ring-black/[0.04] ${slot.cls}`}
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-[22px] bg-wash">
              {img ? (
                <Image src={img} alt={p?.name ?? ""} fill sizes="240px" priority={i === 0} className="object-cover" />
              ) : (
                <div className={`size-full ${TILE_BACKGROUNDS[i % TILE_BACKGROUNDS.length]}`} />
              )}
            </div>
            {p ? (
              <div className="flex items-center justify-between gap-2 px-1.5 pb-0.5 pt-2">
                <span className="truncate text-xs font-medium">{p.name}</span>
                <span className="shrink-0 rounded-full bg-ink px-2 py-0.5 text-[10px] font-semibold text-white">
                  {formatMoney(p.min_price)}
                </span>
              </div>
            ) : null}
          </Link>
        );
      })}
      <div className="glass absolute -left-2 bottom-[30%] z-10 hidden items-center gap-2 rounded-2xl px-3 py-2 shadow-soft ring-1 ring-black/5 sm:flex">
        <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-brand">
          <Ship className="size-4" aria-hidden />
        </span>
        <span className="text-xs font-medium leading-tight">
          Every atoll,
          <br />
          every island
        </span>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [settings, categories, featured, newest] = await Promise.all([
    getSettings(),
    getCategories(),
    getFeaturedProducts(8),
    getNewestProducts(8),
  ]);

  const picks = featured.length > 0 ? featured : newest;
  const picksTitle = featured.length > 0 ? "Island favourites" : "New arrivals";
  const heroItems = [...featured, ...newest].filter(
    (p, i, all) => p.image_path && all.findIndex((q) => q.id === p.id) === i
  );

  // a photo for each category tile, taken from its products
  const pool = [...featured, ...newest];
  const imageFor = (slug: string) => {
    const hit = pool.find((p) => p.category_slug === slug && p.image_path);
    return hit ? productImageUrl(hit.image_path) : null;
  };

  return (
    <div className="space-y-20 sm:space-y-28">
      {/* ---------- Hero ---------- */}
      <section className="hero-wash lattice relative overflow-hidden rounded-[2rem] bg-white/60 px-5 pb-12 pt-10 ring-1 ring-black/[0.04] sm:px-10 sm:pt-14 lg:px-14">
        <div className="grid items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="settle">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-brand shadow-soft ring-1 ring-black/5">
              <Sparkles className="size-3.5 text-gold" aria-hidden />
              New season, just landed
            </p>
            <h1 className="mt-5 text-[2.6rem] font-semibold leading-[1.02] sm:text-6xl lg:text-7xl">
              Island living,
              <br />
              <span className="accent-serif text-brand">beautifully</span> delivered.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Curated things at honest prices, sent to your atoll and island. Pay by simple bank transfer from any
              Maldivian bank and upload your slip. We handle the rest.
            </p>

            <form action="/products" role="search" className="mt-8 flex max-w-lg items-center gap-2 rounded-full bg-white p-1.5 shadow-lift ring-1 ring-black/5">
              <label htmlFor="hero-search" className="sr-only">
                Search products
              </label>
              <Search className="ml-3 size-5 shrink-0 text-muted" aria-hidden />
              <input
                id="hero-search"
                name="q"
                type="search"
                maxLength={100}
                placeholder={`Search ${settings.store_name}`}
                className="h-11 min-w-0 flex-1 bg-transparent px-1 text-[15px] placeholder:text-muted/70 focus:outline-none"
              />
              <button
                type="submit"
                className="h-11 rounded-full bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-brand"
              >
                Search
              </button>
            </form>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-soft transition-colors hover:bg-brand-strong"
              >
                Shop now <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/account"
                className="inline-flex h-12 items-center rounded-full bg-white px-6 text-sm font-medium ring-1 ring-inset ring-line transition-colors hover:bg-wash"
              >
                Track an order
              </Link>
            </div>
          </div>

          <HeroCollage items={heroItems} />
        </div>
      </section>

      {/* ---------- Categories: asymmetric bento ---------- */}
      {categories.length > 0 ? (
        <section aria-labelledby="cats-heading">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-ink">Browse</p>
              <h2 id="cats-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">
                Shop by <span className="accent-serif text-brand">category</span>
              </h2>
            </div>
            <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
              View all <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <ul className="grid auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[190px] sm:gap-4 md:grid-cols-4">
            {categories.slice(0, 7).map((c, i) => {
              const Icon = iconFor(c.name);
              const img = imageFor(c.slug);
              const big = i === 0;
              return (
                <li key={c.id} className={big ? "col-span-2 row-span-2" : i === 3 ? "md:col-span-2" : ""}>
                  <Link
                    href={`/category/${c.slug}`}
                    className={`group relative flex size-full flex-col justify-end overflow-hidden rounded-3xl p-5 text-white shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift ${TILE_BACKGROUNDS[i % TILE_BACKGROUNDS.length]}`}
                  >
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 25vw, 50vw"
                        className="object-cover opacity-60 mix-blend-luminosity transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                    <Icon className="absolute right-4 top-4 size-10 text-white/30 transition-transform duration-300 group-hover:scale-110 sm:size-14" aria-hidden />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                    <div className="relative">
                      <h3 className={`font-display font-semibold tracking-tight ${big ? "text-3xl" : "text-xl"}`}>{c.name}</h3>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-white/85">
                        Explore <ArrowRight className="size-3 transition-transform group-hover:translate-x-1" aria-hidden />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ---------- Featured ---------- */}
      <section aria-labelledby="picks-heading">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-ink">Hand-picked</p>
            <h2 id="picks-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">
              {picksTitle.split(" ")[0]}{" "}
              <span className="accent-serif text-brand">{picksTitle.split(" ").slice(1).join(" ")}</span>
            </h2>
          </div>
          <Link href="/products" className="flex items-center gap-1 text-sm font-medium text-brand hover:underline">
            Shop everything <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        {picks.length > 0 ? (
          <ProductGrid products={picks} />
        ) : (
          <p className="rounded-3xl bg-surface px-6 py-12 text-center text-muted ring-1 ring-line">
            No products yet. Products added in the admin area will appear here.
          </p>
        )}
      </section>

      {/* ---------- Delivery story ---------- */}
      <section
        aria-label="How delivery works"
        className="bg-ocean lattice relative overflow-hidden rounded-[2rem] p-7 text-white shadow-lift sm:p-12"
      >
        <div className="relative grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Made for the islands</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">
              From Mal&eacute; to your <span className="accent-serif text-gold">jetty</span>.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/75">
              Tell us your atoll and island at checkout. We send your order by courier or scheduled vessel and share
              the vessel name so you know exactly when to meet it.
            </p>
            <div className="mt-8 flex items-center gap-3" aria-hidden>
              <span className="grid size-9 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
                <Landmark className="size-4" />
              </span>
              <span className="h-px flex-1 border-t border-dashed border-white/40" />
              <span className="grid size-9 place-items-center rounded-full bg-gold text-lagoon-deep">
                <Ship className="size-4" />
              </span>
              <span className="h-px flex-1 border-t border-dashed border-white/40" />
              <span className="grid size-9 place-items-center rounded-full bg-white/15 ring-1 ring-white/30">
                <Truck className="size-4" />
              </span>
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-white/60" aria-hidden>
              <span>Our store</span>
              <span>Vessel</span>
              <span>Your island</span>
            </div>
          </div>
          <ol className="grid gap-3">
            {[
              { icon: PackageCheck, title: "Place your order", text: "Choose items and enter your island and delivery details. Stock is reserved at once." },
              { icon: Landmark, title: "Pay by bank transfer", text: "Transfer the total, then upload a photo of your payment slip on your order page." },
              { icon: ShieldCheck, title: "We confirm and dispatch", text: "We check your payment by hand, approve the order and send it on its way." },
            ].map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="flex gap-4 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-sm">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
                  <Icon className="size-5 text-gold" aria-hidden />
                </span>
                <div>
                  <h3 className="font-sans text-[15px] font-semibold tracking-normal">
                    {i + 1}. {title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/70">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- New arrivals ---------- */}
      {featured.length > 0 && newest.length > 0 ? (
        <section aria-labelledby="new-heading">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-ink">Just in</p>
            <h2 id="new-heading" className="mt-2 text-3xl font-semibold sm:text-4xl">
              New <span className="accent-serif text-brand">arrivals</span>
            </h2>
          </div>
          <ProductGrid products={newest.slice(0, 4)} />
        </section>
      ) : null}

      {/* ---------- Trust strip ---------- */}
      <section aria-label="Why shop with us">
        <div className="wave-rule mb-10" aria-hidden />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Landmark, title: "Any Maldivian bank", text: "Transfer from your own bank app, no card needed." },
            { icon: ShieldCheck, title: "Payments checked by hand", text: "Every slip is reviewed before dispatch." },
            { icon: Ship, title: "Vessel delivery", text: "We tell you the vessel name for your island." },
            { icon: PackageCheck, title: "Easy cancel", text: "Cancel any unpaid order and stock is released." },
          ].map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gold-soft text-gold-ink">
                <Icon className="size-5" aria-hidden />
              </span>
              <div>
                <h3 className="font-sans text-[15px] font-semibold tracking-normal">{title}</h3>
                <p className="mt-0.5 text-sm text-muted">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
