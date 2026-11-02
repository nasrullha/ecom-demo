"use client";

import Image from "next/image";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn, productImageUrl } from "@/lib/utils";

export function ProductGallery({
  images,
  name,
}: {
  images: { id: string; path: string; alt: string | null }[];
  name: string;
}) {
  const [index, setIndex] = useState(0);
  const current = images[index];
  const url = current ? productImageUrl(current.path) : null;

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-wash">
        {url ? (
          <Image
            key={current.id}
            src={url}
            alt={current.alt || name}
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-muted/60">
            <ImageOff className="size-10" aria-hidden />
            <span className="sr-only">No photo yet</span>
          </div>
        )}
      </div>

      {images.length > 1 ? (
        <ul className="grid grid-cols-5 gap-2 sm:grid-cols-6" aria-label="Product photos">
          {images.map((img, i) => {
            const thumb = productImageUrl(img.path);
            return (
              <li key={img.id}>
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`Show photo ${i + 1} of ${images.length}`}
                  aria-current={i === index}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-lg bg-wash ring-2 transition",
                    i === index ? "ring-brand" : "ring-transparent hover:ring-line"
                  )}
                >
                  {thumb ? <Image src={thumb} alt="" fill sizes="96px" className="object-cover" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
