import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ImageOff, Plus } from "lucide-react";
import { Pagination } from "@/components/pagination";
import { Badge, Button, ButtonLink, EmptyState, Input, PageTitle, Select } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { getCategories } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { productImageUrl } from "@/lib/utils";
import type { ProductCardData } from "@/lib/types";

export const metadata: Metadata = { title: "Products" };

const PAGE_SIZE = 20;

type Props = { searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }> };

export default async function AdminProductsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = (sp.q ?? "").toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, " ").trim().slice(0, 60);
  const category = (sp.category ?? "").slice(0, 100);
  const status = ["active", "hidden", "soldout"].includes(sp.status ?? "") ? sp.status : undefined;
  const page = Math.min(500, Math.max(1, Math.floor(Number(sp.page)) || 1));

  const supabase = await createClient();
  const categories = await getCategories();

  let query = supabase
    .from("product_listing")
    .select("id,name,slug,price,min_price,max_price,total_stock,image_path,category_name,is_active,is_featured,created_at", { count: "exact" })
    .order("created_at", { ascending: false });
  for (const token of q.split(/\s+/).filter(Boolean).slice(0, 5)) query = query.ilike("search_text", `%${token}%`);
  if (category) query = query.eq("category_slug", category);
  if (status === "active") query = query.eq("is_active", true);
  if (status === "hidden") query = query.eq("is_active", false);
  if (status === "soldout") query = query.eq("total_stock", 0);

  const from = (page - 1) * PAGE_SIZE;
  const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
  const rows = (data as unknown as ProductCardData[] | null) ?? [];
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const href = (p: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (category) next.set("category", category);
    if (status) next.set("status", status);
    if (p > 1) next.set("page", String(p));
    const s = next.toString();
    return s ? `/admin/products?${s}` : "/admin/products";
  };

  return (
    <>
      <PageTitle title="Products">
        <ButtonLink href="/admin/products/new">
          <Plus className="size-4" aria-hidden /> Add product
        </ButtonLink>
      </PageTitle>

      <form action="/admin/products" role="search" className="mb-5 flex flex-wrap gap-2">
        <label htmlFor="pq" className="sr-only">
          Search products
        </label>
        <Input id="pq" name="q" defaultValue={q} placeholder="Search by name" className="w-full sm:w-64" maxLength={60} />
        <Select name="category" defaultValue={category} aria-label="Category" className="w-auto">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={status ?? ""} aria-label="Status" className="w-auto">
          <option value="">Any status</option>
          <option value="active">Visible</option>
          <option value="hidden">Hidden</option>
          <option value="soldout">Sold out</option>
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No products found" action={<ButtonLink href="/admin/products/new">Add your first product</ButtonLink>}>
          Products you add here appear in the shop.
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-line text-muted">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Product</th>
                <th scope="col" className="px-4 py-3 font-medium">Category</th>
                <th scope="col" className="px-4 py-3 font-medium">Price</th>
                <th scope="col" className="px-4 py-3 font-medium">Stock</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => {
                const img = productImageUrl(p.image_path);
                return (
                  <tr key={p.id} className="hover:bg-wash/50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-md bg-wash">
                          {img ? (
                            <Image src={img} alt="" fill sizes="44px" className="object-cover" />
                          ) : (
                            <span className="flex size-full items-center justify-center text-muted/60">
                              <ImageOff className="size-4" aria-hidden />
                            </span>
                          )}
                        </span>
                        <span className="font-medium text-brand hover:underline">{p.name}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{p.category_name ?? "None"}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.min_price === p.max_price ? formatMoney(p.min_price) : `${formatMoney(p.min_price)} – ${formatMoney(p.max_price)}`}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {p.total_stock === 0 ? <span className="font-medium text-danger">Sold out</span> : p.total_stock}
                    </td>
                    <td className="px-4 py-3">
                      {p.is_active ? (
                        <Badge className="bg-emerald-100 text-emerald-900">Visible</Badge>
                      ) : (
                        <Badge className="bg-wash text-muted">Hidden</Badge>
                      )}
                      {p.is_featured ? <Badge className="ml-1 bg-amber-100 text-amber-900">Featured</Badge> : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} hrefFor={href} />
    </>
  );
}
