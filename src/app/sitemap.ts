import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/products`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const supabase = await createClient();
    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from("products").select("slug,updated_at").eq("is_active", true).limit(5000),
      supabase.from("categories").select("slug").limit(500),
    ]);

    for (const p of (products as { slug: string; updated_at: string }[] | null) ?? []) {
      entries.push({ url: `${SITE_URL}/products/${p.slug}`, lastModified: p.updated_at, changeFrequency: "weekly", priority: 0.7 });
    }
    for (const c of (categories as { slug: string }[] | null) ?? []) {
      entries.push({ url: `${SITE_URL}/category/${c.slug}`, changeFrequency: "weekly", priority: 0.6 });
    }
  } catch {
    // database not reachable: still serve the basic entries
  }
  return entries;
}
