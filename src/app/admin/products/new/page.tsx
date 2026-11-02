import Link from "next/link";
import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { PageTitle } from "@/components/ui";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <div className="max-w-4xl">
      <p className="mb-2 text-sm">
        <Link href="/admin/products" className="text-muted hover:text-ink">
          &larr; All products
        </Link>
      </p>
      <PageTitle title="Add product" />
      <ProductForm categories={categories} />
    </div>
  );
}
