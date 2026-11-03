import Link from "next/link";
import { Landmark, Ship, ShieldCheck } from "lucide-react";
import { CURRENCY } from "@/lib/env";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductPurchase } from "@/components/shop/product-purchase";
import { ProductGrid } from "@/components/shop/product-card";
import { SITE_URL } from "@/lib/env";
import { getProductBySlug, getRelatedProducts } from "@/lib/queries";
import { productImageUrl } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };

  const image = productImageUrl(product.product_images[0]?.path);
  const description = product.description?.slice(0, 160) || `Buy ${product.name} online.`;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description, images: image ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categories?.slug ?? null, product.id);

  const prices = product.product_variants.map((v) => v.price ?? product.price);
  const lowPrice = prices.length ? Math.min(...prices) : product.price;
  const inStock = product.product_variants.some((v) => v.stock > 0);

  // Structured data helps Google show price and stock in search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    image: product.product_images.map((i) => productImageUrl(i.path)).filter(Boolean),
    sku: product.product_variants[0]?.sku ?? undefined,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/products/${product.slug}`,
      price: lowPrice.toFixed(2),
      priceCurrency: CURRENCY,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/products" className="hover:text-ink">
              Shop
            </Link>
          </li>
          {product.categories ? (
            <li className="flex items-center gap-1.5">
              <span aria-hidden>/</span>
              <Link href={`/category/${product.categories.slug}`} className="hover:text-ink">
                {product.categories.name}
              </Link>
            </li>
          ) : null}
          <li className="flex items-center gap-1.5">
            <span aria-hidden>/</span>
            <span className="text-ink" aria-current="page">
              {product.name}
            </span>
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-14">
        <ProductGallery images={product.product_images.map((i) => ({ id: i.id, path: i.path, alt: i.alt }))} name={product.name} />

        <div className="lg:py-2">
          {product.brand ? <p className="text-sm text-muted">{product.brand}</p> : null}
          <h1 className="mt-1 text-3xl font-semibold sm:text-4xl">{product.name}</h1>

          <div className="mt-5">
            <ProductPurchase
              optionNames={product.option_names ?? []}
              variants={product.product_variants}
              basePrice={product.price}
              compareAtPrice={product.compare_at_price}
            />
          </div>

          <ul className="mt-6 grid gap-3 rounded-3xl bg-gold-soft/60 p-4 text-sm ring-1 ring-gold/25 sm:grid-cols-3">
            <li className="flex items-start gap-2.5">
              <Ship className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden />
              <span>
                <strong className="block font-semibold">Island delivery</strong>
                <span className="text-muted">Courier or vessel to your island</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Landmark className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden />
              <span>
                <strong className="block font-semibold">Bank transfer</strong>
                <span className="text-muted">Upload your slip after ordering</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-ink" aria-hidden />
              <span>
                <strong className="block font-semibold">Checked by hand</strong>
                <span className="text-muted">Every payment is verified</span>
              </span>
            </li>
          </ul>

          {product.description ? (
            <section className="mt-8 border-t border-line pt-6" aria-labelledby="desc-heading">
              <h2 id="desc-heading" className="text-lg font-semibold">
                Description
              </h2>
              <p className="mt-2 max-w-prose whitespace-pre-line leading-relaxed text-muted">{product.description}</p>
            </section>
          ) : null}
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2 id="related-heading" className="mb-5 text-2xl font-semibold">
            You may also like
          </h2>
          <ProductGrid products={related} />
        </section>
      ) : null}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
    </article>
  );
}
