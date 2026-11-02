import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/shop/catalog-view";
import { getCategories } from "@/lib/queries";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  return category ? { title: category.name, description: category.description ?? undefined } : { title: "Category" };
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = (await getCategories()).find((c) => c.slug === slug);
  if (!category) notFound();

  return (
    <CatalogView
      params={await searchParams}
      basePath={`/category/${category.slug}`}
      fixedCategory={category.slug}
      title={category.name}
      intro={category.description}
    />
  );
}
