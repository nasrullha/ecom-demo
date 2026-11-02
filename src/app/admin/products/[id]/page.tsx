import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { PageTitle } from "@/components/ui";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import type { ProductDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Edit product" };

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data }, categories] = await Promise.all([
    supabase.from("products").select("*, product_variants(*), product_images(*)").eq("id", id).maybeSingle(),
    getCategories(),
  ]);
  if (!data) notFound();

  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-sm">
        <Link href="/admin/products" className="text-muted hover:text-ink">
          &larr; All products
        </Link>
      </p>
      <PageTitle title="Edit product" />
      {/* key makes the form start fresh if you open a different product */}
      <ProductForm key={id} product={data as unknown as ProductDetail} categories={categories} />
    </div>
  );
}
