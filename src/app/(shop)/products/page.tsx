import type { Metadata } from "next";
import { CatalogView } from "@/components/shop/catalog-view";

export const metadata: Metadata = { title: "Shop" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  return <CatalogView params={params} basePath="/products" title="All products" />;
}
