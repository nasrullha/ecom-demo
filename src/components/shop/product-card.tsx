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
  const sizes = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

  return (
    <article className="group">
      <Link href={`/products/${product.slug}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-wash">
          {first ? (
            <>
              <Image
                src={first}
                alt={product.name}
                fill
                sizes={sizes}
                priority={priority}
                className="object-cover transition-opacity duration-300"
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
            <span className="absolute left-2 top-2 rounded-md bg-ink px-2 py-0.5 text-xs font-medium text-white">Sold out</span>
          ) : onSale ? (
            <span className="absolute left-2 top-2 rounded-md bg-sale px-2 py-0.5 text-xs font-medium text-white">Sale</span>
          ) : null}
        </div>
        <div className="mt-3 space-y-0.5">
          {product.category_name ? <p className="text-xs text-muted">{product.category_name}</p> : null}
          <h3 className="font-sans text-sm font-medium leading-snug tracking-normal group-hover:underline">
            {product.name}
          </h3>
          <Price min={product.min_price} max={product.max_price} compareAt={product.compare_at_price} className="text-sm" />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} priority={i < 4} />
        </li>
      ))}
    </ul>
  );
}
