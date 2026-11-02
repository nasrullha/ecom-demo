import type { Metadata } from "next";
import { CategoryManager } from "@/components/admin/category-manager";
import { PageTitle } from "@/components/ui";
import { getCategories } from "@/lib/queries";

export const metadata: Metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const categories = await getCategories();
  return (
    <>
      <PageTitle title="Categories" />
      <CategoryManager categories={categories} />
    </>
  );
}
