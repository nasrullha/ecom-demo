"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAdminAction } from "@/lib/auth";
import { ImageProcessingError, processImage, PRODUCT_PROCESS_OPTIONS } from "@/lib/image-server";
import { randomSuffix, roundMoney, slugify } from "@/lib/utils";
import { categoryInputSchema, firstError, productInputSchema, settingsSchema } from "@/lib/validators";
import type { ActionResult } from "@/lib/types";

const UUID = /^[0-9a-f-]{36}$/i;

function refreshStorefront(slug?: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/category/[slug]", "page");
  if (slug) revalidatePath(`/products/${slug}`);
  revalidatePath("/admin");
  revalidatePath("/admin/products");
}

function dbMessage(error: { code?: string; message: string }, fallback: string): string {
  if (error.code === "23505") {
    if (error.message.includes("sku")) return "That SKU is already used by another variant.";
    return "Something with that name or web address already exists.";
  }
  if (error.code === "23514") return "One of the values is out of range. Please check prices and text lengths.";
  console.error("Database error:", error.code, error.message);
  return fallback;
}

// ------------------------------------------------------------- products

export async function saveProductAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;

  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const p = parsed.data;

  // Every variant must have a value for every option, and no two may be identical.
  const seen = new Set<string>();
  const skus = new Set<string>();
  for (const v of p.variants) {
    for (const name of p.optionNames) {
      if (!v.options[name]) return { ok: false, error: `Fill in "${name}" for every variant.` };
    }
    const key = JSON.stringify(p.optionNames.map((n) => v.options[n]));
    if (seen.has(key)) return { ok: false, error: "Two variants have the same options. Remove one." };
    seen.add(key);
    if (v.sku) {
      const sku = v.sku.toLowerCase();
      if (skus.has(sku)) return { ok: false, error: `The SKU "${v.sku}" is used twice.` };
      skus.add(sku);
    }
  }
  if (new Set(p.optionNames.map((n) => n.toLowerCase())).size !== p.optionNames.length) {
    return { ok: false, error: "Option names must be different from each other." };
  }
  if (p.compareAtPrice != null && p.compareAtPrice < p.price) {
    return { ok: false, error: "The 'compare at' price must be higher than the price." };
  }

  const { supabase } = admin;
  const baseSlug = slugify(p.slug || p.name);

  const row = {
    name: p.name,
    brand: p.brand ?? null,
    description: p.description ?? null,
    category_id: p.categoryId ?? null,
    price: roundMoney(p.price),
    compare_at_price: p.compareAtPrice != null ? roundMoney(p.compareAtPrice) : null,
    option_names: p.optionNames,
    is_active: p.isActive,
    is_featured: p.isFeatured,
  };

  let productId = p.id;
  let finalSlug = baseSlug;

  if (productId) {
    // Keep the existing web address unless the admin typed a new one.
    const update: Record<string, unknown> = { ...row };
    if (p.slug) update.slug = baseSlug;
    const { data, error } = await supabase
      .from("products")
      .update(update)
      .eq("id", productId)
      .select("slug")
      .maybeSingle();
    if (error) return { ok: false, error: dbMessage(error, "We could not save the product.") };
    if (!data) return { ok: false, error: "Product not found." };
    finalSlug = (data as { slug: string }).slug;
  } else {
    let created: { id: string; slug: string } | null = null;
    for (let attempt = 0; attempt < 3 && !created; attempt++) {
      const slug = attempt === 0 ? baseSlug : `${baseSlug}-${randomSuffix()}`;
      const { data, error } = await supabase
        .from("products")
        .insert({ ...row, slug })
        .select("id,slug")
        .single();
      if (!error) {
        created = data as { id: string; slug: string };
      } else if (error.code !== "23505") {
        return { ok: false, error: dbMessage(error, "We could not save the product.") };
      }
    }
    if (!created) return { ok: false, error: "Could not create a unique web address. Change the product name." };
    productId = created.id;
    finalSlug = created.slug;
  }

  // ---- variants: update existing, insert new, delete removed
  const variantRows = p.variants.map((v, index) => ({
    id: v.id,
    product_id: productId as string,
    sku: v.sku || null,
    name: p.optionNames.length ? p.optionNames.map((n) => v.options[n]).join(" / ") : "Default",
    options: Object.fromEntries(p.optionNames.map((n) => [n, v.options[n]])),
    price: v.price != null ? roundMoney(v.price) : null,
    stock: v.stock,
    is_active: v.isActive,
    sort_order: index + 1,
  }));

  const rollbackNewProduct = async () => {
    if (!p.id && productId) await supabase.from("products").delete().eq("id", productId);
  };

  const { data: existing } = await supabase
    .from("product_variants")
    .select("id")
    .eq("product_id", productId);
  const existingIds = new Set(((existing as { id: string }[] | null) ?? []).map((r) => r.id));

  const keepIds = new Set(variantRows.filter((v) => v.id && existingIds.has(v.id)).map((v) => v.id as string));
  const removeIds = Array.from(existingIds).filter((id) => !keepIds.has(id));

  // Remove first so a removed variant's SKU can be reused by a new one.
  if (removeIds.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", removeIds);
    if (error) return { ok: false, error: dbMessage(error, "We could not remove old variants.") };
  }

  // If the admin did not touch the stock number, leave live stock alone: a
  // customer may have bought something while the form was open.
  const originalStockById = new Map(
    p.variants.filter((v) => v.id && v.originalStock !== undefined).map((v) => [v.id as string, v.originalStock as number])
  );

  for (const v of variantRows) {
    if (v.id && existingIds.has(v.id)) {
      const { id, ...rest } = v;
      const update: Record<string, unknown> = { ...rest };
      if (originalStockById.get(id as string) === v.stock) delete update.stock;
      const { error } = await supabase.from("product_variants").update(update).eq("id", id as string);
      if (error) return { ok: false, error: dbMessage(error, "We could not save a variant.") };
    } else {
      const { id: _ignored, ...rest } = v;
      void _ignored;
      const { error } = await supabase.from("product_variants").insert(rest);
      if (error) {
        await rollbackNewProduct();
        return { ok: false, error: dbMessage(error, "We could not save a variant.") };
      }
    }
  }

  refreshStorefront(finalSlug);
  return { ok: true, id: productId as string };
}

export async function deleteProductAction(productId: string): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;
  if (typeof productId !== "string" || !UUID.test(productId)) return { ok: false, error: "Product not found." };

  const { supabase } = admin;
  const { data: images } = await supabase.from("product_images").select("path").eq("product_id", productId);
  const paths = ((images as { path: string }[] | null) ?? []).map((i) => i.path);
  if (paths.length) await supabase.storage.from("product-images").remove(paths);

  // Past orders keep their own copy of name/price, so deleting is safe.
  const { error } = await supabase.from("products").delete().eq("id", productId);
  if (error) return { ok: false, error: dbMessage(error, "We could not delete the product.") };

  refreshStorefront();
  return { ok: true };
}

// --------------------------------------------------------------- images

export async function uploadProductImageAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;

  const productId = formData.get("productId");
  if (typeof productId !== "string" || !UUID.test(productId)) return { ok: false, error: "Product not found." };

  let processed: Awaited<ReturnType<typeof processImage>>;
  try {
    processed = await processImage(formData.get("file"), PRODUCT_PROCESS_OPTIONS);
  } catch (e) {
    if (e instanceof ImageProcessingError) return { ok: false, error: e.message };
    console.error("Product image processing failed:", e);
    return { ok: false, error: "We could not process that image." };
  }

  const { supabase } = admin;
  const path = `${productId}/${randomUUID()}.webp`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, processed.buffer, {
      contentType: processed.contentType,
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) {
    console.error("Product image upload failed:", uploadError.message);
    return { ok: false, error: "Upload failed. Please try again." };
  }

  const { data: last } = await supabase
    .from("product_images")
    .select("sort_order")
    .eq("product_id", productId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((last as { sort_order: number } | null)?.sort_order ?? -1) + 1;

  const { data, error } = await supabase
    .from("product_images")
    .insert({ product_id: productId, path, sort_order: nextOrder })
    .select("id")
    .single();
  if (error) {
    await supabase.storage.from("product-images").remove([path]);
    return { ok: false, error: dbMessage(error, "We could not save the image.") };
  }

  refreshStorefront();
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteProductImageAction(imageId: string): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;
  if (typeof imageId !== "string" || !UUID.test(imageId)) return { ok: false, error: "Image not found." };

  const { supabase } = admin;
  const { data } = await supabase.from("product_images").select("path").eq("id", imageId).maybeSingle();
  if (!data) return { ok: false, error: "Image not found." };

  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, error: dbMessage(error, "We could not delete the image.") };
  await supabase.storage.from("product-images").remove([(data as { path: string }).path]);

  refreshStorefront();
  return { ok: true };
}

/** Saves a new picture order. The first id becomes the main image. */
export async function reorderProductImagesAction(orderedIds: string[]): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;
  if (!Array.isArray(orderedIds) || orderedIds.length > 50 || !orderedIds.every((id) => typeof id === "string" && UUID.test(id))) {
    return { ok: false, error: "Invalid image order." };
  }

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await admin.supabase.from("product_images").update({ sort_order: i }).eq("id", orderedIds[i]);
    if (error) return { ok: false, error: dbMessage(error, "We could not reorder the images.") };
  }

  refreshStorefront();
  return { ok: true };
}

// ----------------------------------------------------------- categories

export async function saveCategoryAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;

  const parsed = categoryInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const c = parsed.data;

  const row = {
    name: c.name,
    description: c.description ?? null,
    sort_order: c.sortOrder,
  };

  if (c.id) {
    const update: Record<string, unknown> = { ...row };
    if (c.slug) update.slug = slugify(c.slug);
    const { error } = await admin.supabase.from("categories").update(update).eq("id", c.id);
    if (error) return { ok: false, error: dbMessage(error, "We could not save the category.") };
  } else {
    const { error } = await admin.supabase
      .from("categories")
      .insert({ ...row, slug: slugify(c.slug || c.name) });
    if (error) return { ok: false, error: dbMessage(error, "We could not save the category.") };
  }

  refreshStorefront();
  revalidatePath("/admin/categories");
  return { ok: true };
}

export async function deleteCategoryAction(categoryId: string): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;
  if (typeof categoryId !== "string" || !UUID.test(categoryId)) return { ok: false, error: "Category not found." };

  // Products in this category are kept; they simply become uncategorised.
  const { error } = await admin.supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { ok: false, error: dbMessage(error, "We could not delete the category.") };

  refreshStorefront();
  revalidatePath("/admin/categories");
  return { ok: true };
}

// ------------------------------------------------------------- settings

export async function saveSettingsAction(input: unknown): Promise<ActionResult> {
  const admin = await requireAdminAction();
  if (!admin.ok) return admin;

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) };
  const s = parsed.data;

  const { error } = await admin.supabase
    .from("store_settings")
    .update({
      store_name: s.storeName,
      bank_name: s.bankName ?? null,
      account_name: s.accountName ?? null,
      account_number: s.accountNumber ?? null,
      payment_instructions: s.paymentInstructions ?? null,
      shipping_fee: roundMoney(s.shippingFee),
      free_shipping_threshold: s.freeShippingThreshold != null ? roundMoney(s.freeShippingThreshold) : null,
      low_stock_threshold: s.lowStockThreshold,
    })
    .eq("id", true);
  if (error) return { ok: false, error: dbMessage(error, "We could not save the settings.") };

  revalidatePath("/", "layout");
  return { ok: true };
}
