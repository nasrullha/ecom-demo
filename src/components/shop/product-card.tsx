import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Price } from "@/components/price";
import { productImageUrl } from "@/lib/utils";
import type { ProductCardData } from "@/lib/types";

export function ProductCard({ product, priority = false }: { product: ProductCardData; priority?: boolean }) {
  const first = productImageUrl(product.image_path);
  const second = productImageUrl(product.image_path_2);
  const soldOut = product.total_stock <= 0;
  const onSale =
    product.compare_at_price !== null && product.compare_at_price > product.min_price && product.min_price === product.max_price;
  const discount = onSale && product.compare_at_price
    ? Math.round((1 - product.min_price / product.compare_at_price) * 100)
    : 0;
  const sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-wash shadow-soft ring-1 ring-black/[0.04] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lift">
          {first ? (
            <>
              <Image
                src={first}
                alt={product.name}
                fill
                sizes={sizes}
                priority={priority}
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              {second ? (
                <Image
                  src={second}
                  alt=""
                  fill
                  sizes={sizes}
                  className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                />
              ) : null}
            </>
          ) : (
            <div className="flex size-full items-center justify-center text-muted/60">
              <ImageOff className="size-8" aria-hidden />
              <span className="sr-only">No photo yet</span>
            </div>
          )}
          {soldOut ? (
            <span className="absolute left-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">Sold out</span>
          ) : onSale ? (
            <span className="absolute left-3 top-3 rounded-full bg-coral px-2.5 py-1 text-xs font-semibold text-white">
              {discount > 0 ? `-${discount}%` : "Sale"}
            </span>
          ) : product.is_featured ? (
            <span className="absolute left-3 top-3 rounded-full bg-gold-soft px-2.5 py-1 text-xs font-medium text-gold-ink">
              Island favourite
            </span>
          ) : null}
        </div>
        <div className="mt-3.5 space-y-1 px-1">
          {product.category_name ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">{product.category_name}</p>
          ) : null}
          <h3 className="font-sans text-[15px] font-medium leading-snug tracking-normal">{product.name}</h3>
          <Price min={product.min_price} max={product.max_price} compareAt={product.compare_at_price} className="text-sm" />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
