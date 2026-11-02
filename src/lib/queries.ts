import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProductFilters } from "@/lib/catalog";
import type {
  Category,
  ProductCardData,
  ProductDetail,
  StoreSettings,
} from "@/lib/types";

export const PAGE_SIZE = 12;

const CARD_COLUMNS =
  "id,name,slug,brand,price,compare_at_price,min_price,max_price,total_stock,image_path,image_path_2,category_slug,category_name,is_featured,is_active,created_at";

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: "My Store",
  bank_name: null,
  account_name: null,
  account_number: null,
  payment_instructions: null,
  shipping_fee: 0,
  free_shipping_threshold: null,
  low_stock_threshold: 5,
};

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("store_settings").select("*").maybeSingle();
  if (error) console.error("Could not load store settings:", error.message);
  return { ...DEFAULT_SETTINGS, ...((data as Partial<StoreSettings> | null) ?? {}) };
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name,slug,description,sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) console.error("Could not load categories:", error.message);
  return (data as Category[] | null) ?? [];
});

export async function getFacets(): Promise<{ name: string; values: string[] }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_option_facets")
    .select("option_name,option_value")
    .order("option_name")
    .order("option_value");
  const rows = (data as { option_name: string; option_value: string }[] | null) ?? [];
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    grouped.set(row.option_name, [...(grouped.get(row.option_name) ?? []), row.option_value]);
  }
  return Array.from(grouped, ([name, values]) => ({ name, values }));
}

/** Split a search phrase into safe lowercase words. */
function searchTokens(q: string): string[] {
  return q
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => t.slice(0, 40));
}

export async function listProducts(filters: ProductFilters) {
  const supabase = await createClient();

  let query = supabase
    .from("product_listing")
    .select(CARD_COLUMNS, { count: "exact" })
    .eq("is_active", true);

  if (filters.category) query = query.eq("category_slug", filters.category);
  if (filters.q) {
    for (const token of searchTokens(filters.q)) query = query.ilike("search_text", `%${token}%`);
  }
  if (filters.min !== undefined) query = query.gte("max_price", filters.min);
  if (filters.max !== undefined) query = query.lte("min_price", filters.max);
  if (filters.inStock) query = query.gt("total_stock", 0);

  // same option name -> OR (Black or White); different names -> AND (Black and Large)
  const byName = new Map<string, string[]>();
  for (const opt of filters.options) {
    const name = opt.split(":")[0];
    byName.set(name, [...(byName.get(name) ?? []), opt]);
  }
  for (const values of byName.values()) query = query.overlaps("option_values", values);

  switch (filters.sort) {
    case "price_asc":
      query = query.order("min_price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("max_price", { ascending: false });
      break;
    case "name":
      query = query.order("name", { ascending: true });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }
  query = query.order("id", { ascending: true });

  const from = (filters.page - 1) * PAGE_SIZE;
  const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
  if (error) console.error("Could not load products:", error.message);

  const total = count ?? 0;
  return {
    products: (data as ProductCardData[] | null) ?? [],
    total,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getFeaturedProducts(limit = 8): Promise<ProductCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_listing")
    .select(CARD_COLUMNS)
    .eq("is_active", true)
    .eq("is_featured", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ProductCardData[] | null) ?? [];
}

export async function getNewestProducts(limit = 8): Promise<ProductCardData[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_listing")
    .select(CARD_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ProductCardData[] | null) ?? [];
}

export async function getRelatedProducts(
  categorySlug: string | null,
  excludeId: string,
  limit = 4
): Promise<ProductCardData[]> {
  if (!categorySlug) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("product_listing")
    .select(CARD_COLUMNS)
    .eq("is_active", true)
    .eq("category_slug", categorySlug)
    .neq("id", excludeId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as ProductCardData[] | null) ?? [];
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductDetail | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, categories(name,slug), product_variants(*), product_images(*)")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) console.error("Could not load product:", error.message);
  if (!data) return null;

  const product = data as ProductDetail;
  product.product_variants = (product.product_variants ?? [])
    .filter((v) => v.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
  product.product_images = (product.product_images ?? []).sort((a, b) => a.sort_order - b.sort_order);
  return product;
});
