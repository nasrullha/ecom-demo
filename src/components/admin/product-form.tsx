"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, Star, Trash2, X } from "lucide-react";
import {
  deleteProductAction,
  deleteProductImageAction,
  reorderProductImagesAction,
  saveProductAction,
  uploadProductImageAction,
} from "@/actions/admin-products";
import { Alert, Button, Card, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { compressImage, ImageError, PRODUCT_IMAGE_OPTIONS } from "@/lib/image-client";
import { cn, formatBytes, productImageUrl } from "@/lib/utils";
import type { Category, ProductDetail, ProductImage } from "@/lib/types";

interface OptionDef {
  name: string;
  values: string; // comma separated, e.g. "Black, White"
}

interface VariantRow {
  key: string;
  id?: string;
  options: Record<string, string>;
  sku: string;
  price: string;
  stock: string;
  originalStock?: number;
  isActive: boolean;
}

interface NewImage {
  key: string;
  file: File;
  preview: string;
  originalSize: number;
}

let keyCounter = 0;
const nextKey = () => `k${++keyCounter}`;

function splitValues(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(",")
    .map((v) => v.trim())
    .filter((v) => {
      if (!v || seen.has(v.toLowerCase())) return false;
      seen.add(v.toLowerCase());
      return true;
    });
}

function cartesian(lists: string[][]): string[][] {
  return lists.reduce<string[][]>((acc, list) => acc.flatMap((combo) => list.map((v) => [...combo, v])), [[]]);
}

function initialOptionDefs(product?: ProductDetail): OptionDef[] {
  if (!product) return [];
  return (product.option_names ?? []).map((name) => ({
    name,
    values: Array.from(new Set(product.product_variants.map((v) => v.options[name]).filter(Boolean))).join(", "),
  }));
}

function initialRows(product?: ProductDetail): VariantRow[] {
  if (!product || product.product_variants.length === 0) {
    return [{ key: nextKey(), options: {}, sku: "", price: "", stock: "0", isActive: true }];
  }
  return [...product.product_variants]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((v) => ({
      key: nextKey(),
      id: v.id,
      options: v.options ?? {},
      sku: v.sku ?? "",
      price: v.price === null ? "" : String(v.price),
      stock: String(v.stock),
      originalStock: v.stock,
      isActive: v.is_active,
    }));
}

export function ProductForm({ product, categories }: { product?: ProductDetail; categories: Category[] }) {
  const router = useRouter();
  const [productId, setProductId] = useState<string | undefined>(product?.id);

  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState(product?.brand ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [categoryId, setCategoryId] = useState(product?.category_id ?? "");
  const [price, setPrice] = useState(product ? String(product.price) : "");
  const [compareAt, setCompareAt] = useState(product?.compare_at_price != null ? String(product.compare_at_price) : "");
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);

  const [optionDefs, setOptionDefs] = useState<OptionDef[]>(() => initialOptionDefs(product));
  const [rows, setRows] = useState<VariantRow[]>(() => initialRows(product));

  const [images, setImages] = useState<ProductImage[]>(() =>
    [...(product?.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  );
  const [newImages, setNewImages] = useState<NewImage[]>([]);
  const [preparing, setPreparing] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  // free the preview URLs when the page is left
  useEffect(
    () => () => {
      newImages.forEach((n) => URL.revokeObjectURL(n.preview));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const activeOptionNames = optionDefs.map((o) => o.name.trim()).filter(Boolean);

  // ------------------------------------------------------------ options
  function generateVariants() {
    setError(null);
    const defs = optionDefs.map((o) => ({ name: o.name.trim(), values: splitValues(o.values) })).filter((o) => o.name);
    if (defs.some((d) => d.values.length === 0)) {
      setError("Type at least one value for every option, separated by commas (for example: Small, Medium, Large).");
      return;
    }
    if (new Set(defs.map((d) => d.name.toLowerCase())).size !== defs.length) {
      setError("Option names must be different from each other.");
      return;
    }
    if (defs.length === 0) {
      setRows((current) => [current[0] ?? { key: nextKey(), options: {}, sku: "", price: "", stock: "0", isActive: true }].map((r) => ({ ...r, options: {} })));
      return;
    }
    const combos = cartesian(defs.map((d) => d.values));
    if (combos.length > 100) {
      setError(`That makes ${combos.length} variants. The limit is 100. Use fewer values.`);
      return;
    }
    setRows((current) =>
      combos.map((combo) => {
        const options = Object.fromEntries(defs.map((d, i) => [d.name, combo[i]]));
        const existing = current.find((r) => defs.every((d) => r.options[d.name] === options[d.name]));
        return existing
          ? { ...existing, options }
          : { key: nextKey(), options, sku: "", price: "", stock: "0", isActive: true };
      })
    );
    setOptionDefs(defs.map((d) => ({ name: d.name, values: d.values.join(", ") })));
  }

  const updateRow = (key: string, patch: Partial<VariantRow>) =>
    setRows((current) => current.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // ------------------------------------------------------------- images
  async function onPickImages(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (fileInput.current) fileInput.current.value = "";
    if (files.length === 0) return;

    setError(null);
    setPreparing(true);
    const added: NewImage[] = [];
    const problems: string[] = [];
    for (const original of files) {
      if (images.length + newImages.length + added.length >= 12) {
        problems.push("A product can have up to 12 photos.");
        break;
      }
      try {
        const file = await compressImage(original, PRODUCT_IMAGE_OPTIONS);
        added.push({ key: nextKey(), file, preview: URL.createObjectURL(file), originalSize: original.size });
      } catch (e) {
        problems.push(`${original.name}: ${e instanceof ImageError ? e.message : "could not be read."}`);
      }
    }
    setNewImages((current) => [...current, ...added]);
    setPreparing(false);
    if (problems.length) setError(problems.join(" "));
  }

  function removeNewImage(key: string) {
    setNewImages((current) => {
      const target = current.find((n) => n.key === key);
      if (target) URL.revokeObjectURL(target.preview);
      return current.filter((n) => n.key !== key);
    });
  }

  async function persistOrder(next: ProductImage[]) {
    const previous = images;
    setImages(next);
    const result = await reorderProductImagesAction(next.map((i) => i.id));
    if (!result.ok) {
      setImages(previous);
      setError(result.error);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];
    void persistOrder(next);
  }

  function makeMain(index: number) {
    if (index === 0) return;
    const next = [images[index], ...images.filter((_, i) => i !== index)];
    void persistOrder(next);
  }

  async function removeExistingImage(image: ProductImage) {
    setError(null);
    const result = await deleteProductImageAction(image.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setImages((current) => current.filter((i) => i.id !== image.id));
  }

  // --------------------------------------------------------------- save
  function save() {
    setError(null);
    setNotice(null);

    const priceNumber = Number(price);
    if (!name.trim()) return setError("Enter a product name.");
    if (price.trim() === "" || !Number.isFinite(priceNumber)) return setError("Enter a valid price.");
    if (compareAt.trim() !== "" && !Number.isFinite(Number(compareAt))) return setError("The 'compare at' price is not a valid number.");

    for (const row of rows) {
      if (row.stock.trim() === "" || !Number.isInteger(Number(row.stock))) return setError("Stock must be a whole number for every variant.");
      if (row.price.trim() !== "" && !Number.isFinite(Number(row.price))) return setError("A variant price is not a valid number.");
    }

    startSaving(async () => {
      const result = await saveProductAction({
        id: productId,
        name,
        slug: slug.trim() || undefined,
        brand: brand.trim() || undefined,
        description: description.trim() || undefined,
        categoryId: categoryId || null,
        price: priceNumber,
        compareAtPrice: compareAt.trim() === "" ? null : Number(compareAt),
        optionNames: activeOptionNames,
        isActive,
        isFeatured,
        variants: rows.map((r) => ({
          id: r.id,
          sku: r.sku.trim() || null,
          options: r.options,
          price: r.price.trim() === "" ? null : Number(r.price),
          stock: Number(r.stock),
          originalStock: r.originalStock,
          isActive: r.isActive,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setProductId(result.id);

      // upload the new photos one at a time (keeps each request small)
      const failures: string[] = [];
      const remaining: NewImage[] = [];
      for (let i = 0; i < newImages.length; i++) {
        const item = newImages[i];
        setProgress(`Uploading photo ${i + 1} of ${newImages.length}…`);
        const body = new FormData();
        body.set("productId", result.id);
        body.set("file", item.file);
        const uploaded = await uploadProductImageAction(body);
        if (uploaded.ok) URL.revokeObjectURL(item.preview);
        else {
          failures.push(uploaded.error);
          remaining.push(item);
        }
      }
      setProgress(null);
      setNewImages(remaining);

      if (failures.length) {
        setError(`The product was saved, but ${failures.length} photo${failures.length === 1 ? "" : "s"} could not be uploaded: ${failures[0]} Press Save again to retry.`);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  function deleteProduct() {
    if (!productId) return;
    startSaving(async () => {
      const result = await deleteProductAction(productId);
      if (!result.ok) {
        setError(result.error);
        setConfirmDelete(false);
        return;
      }
      router.push("/admin/products");
      router.refresh();
    });
  }

  const labelFor = (row: VariantRow) => (activeOptionNames.length ? activeOptionNames.map((n) => row.options[n] ?? "?").join(" / ") : "Default");

  return (
    <div className="space-y-6">
      {error ? <Alert>{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Details</h2>
        <Field label="Name" htmlFor="p-name">
          <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category" htmlFor="p-category" hint="Create categories under Categories in the menu.">
            <Select id="p-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Brand (optional)" htmlFor="p-brand">
            <Input id="p-brand" value={brand} onChange={(e) => setBrand(e.target.value)} maxLength={80} />
          </Field>
        </div>
        <Field label="Description" htmlFor="p-desc">
          <Textarea id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={6} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" htmlFor="p-price" hint="Used by every variant unless you set a different price for it below.">
            <Input id="p-price" type="number" inputMode="decimal" min={0} step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </Field>
          <Field label="Compare-at price (optional)" htmlFor="p-compare" hint="The old, higher price. It shows crossed out and marks the product as on sale.">
            <Input id="p-compare" type="number" inputMode="decimal" min={0} step="0.01" value={compareAt} onChange={(e) => setCompareAt(e.target.value)} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-6">
          <Checkbox label="Visible in the shop" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <Checkbox label="Featured on the home page" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
        </div>
        {product ? (
          <Field label="Web address (optional)" htmlFor="p-slug" hint={`Currently /products/${product.slug}. Leave empty to keep it.`}>
            <Input id="p-slug" value={slug} onChange={(e) => setSlug(e.target.value)} maxLength={100} placeholder={product.slug} />
          </Field>
        ) : null}
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Photos</h2>
          <p className="text-sm text-muted">
            The first photo is the main one. Photos are shrunk to a few hundred KB automatically, so you can upload them straight from
            your camera.
          </p>
        </div>

        {images.length + newImages.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {images.map((img, i) => (
              <li key={img.id} className="space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-wash ring-1 ring-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={productImageUrl(img.path) ?? ""} alt="" className="size-full object-cover" />
                  {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded bg-ink px-1.5 py-0.5 text-xs text-white">Main</span> : null}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex">
                    <button type="button" className="rounded p-1.5 hover:bg-wash disabled:opacity-30" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label="Move earlier">
                      <ArrowLeft className="size-4" aria-hidden />
                    </button>
                    <button type="button" className="rounded p-1.5 hover:bg-wash disabled:opacity-30" onClick={() => moveImage(i, 1)} disabled={i === images.length - 1} aria-label="Move later">
                      <ArrowRight className="size-4" aria-hidden />
                    </button>
                    <button type="button" className="rounded p-1.5 hover:bg-wash disabled:opacity-30" onClick={() => makeMain(i)} disabled={i === 0} aria-label="Make main photo">
                      <Star className="size-4" aria-hidden />
                    </button>
                  </div>
                  <button type="button" className="rounded p-1.5 text-danger hover:bg-danger-soft" onClick={() => removeExistingImage(img)} aria-label="Delete photo">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
            {newImages.map((n) => (
              <li key={n.key} className="space-y-1.5">
                <div className="relative aspect-square overflow-hidden rounded-lg bg-wash ring-2 ring-brand/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={n.preview} alt="" className="size-full object-cover" />
                  <span className="absolute left-1.5 top-1.5 rounded bg-brand px-1.5 py-0.5 text-xs text-white">New</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {formatBytes(n.originalSize)} → {formatBytes(n.file.size)}
                  </span>
                  <button type="button" className="rounded p-1 hover:bg-wash" onClick={() => removeNewImage(n.key)} aria-label="Remove this photo">
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : null}

        <div>
          <input ref={fileInput} id="p-files" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onPickImages} className="sr-only" />
          <label
            htmlFor="p-files"
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-surface px-4 text-sm font-medium ring-1 ring-inset ring-line hover:bg-wash focus-within:ring-2"
          >
            {preparing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
            {preparing ? "Preparing photos…" : "Add photos"}
          </label>
          <p className="mt-1.5 text-xs text-muted">New photos are uploaded when you press Save.</p>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Variants and stock</h2>
          <p className="text-sm text-muted">
            If the product comes in different sizes or colors, add them as options. Otherwise leave options empty and set the stock below.
          </p>
        </div>

        <div className="space-y-3">
          {optionDefs.map((def, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
              <Field label={`Option ${i + 1} name`} htmlFor={`opt-name-${i}`}>
                <Input
                  id={`opt-name-${i}`}
                  value={def.name}
                  maxLength={30}
                  placeholder="Size"
                  onChange={(e) => setOptionDefs((c) => c.map((d, j) => (j === i ? { ...d, name: e.target.value } : d)))}
                />
              </Field>
              <Field label="Values, separated by commas" htmlFor={`opt-values-${i}`}>
                <Input
                  id={`opt-values-${i}`}
                  value={def.values}
                  placeholder="Small, Medium, Large"
                  onChange={(e) => setOptionDefs((c) => c.map((d, j) => (j === i ? { ...d, values: e.target.value } : d)))}
                />
              </Field>
              <Button variant="ghost" onClick={() => setOptionDefs((c) => c.filter((_, j) => j !== i))} aria-label={`Remove option ${i + 1}`}>
                <X className="size-4" aria-hidden />
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {optionDefs.length < 3 ? (
              <Button variant="secondary" size="sm" onClick={() => setOptionDefs((c) => [...c, { name: "", values: "" }])}>
                Add an option
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={generateVariants}>
              {optionDefs.length ? "Create variants from options" : "Use a single variant"}
            </Button>
          </div>
          {optionDefs.length ? (
            <p className="text-xs text-muted">
              Press “Create variants from options” after changing options. Variants you already filled in are kept when they still
              exist.
            </p>
          ) : null}
        </div>

        <div className="overflow-x-auto rounded-lg ring-1 ring-line">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-wash text-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">Variant</th>
                <th scope="col" className="px-3 py-2 font-medium">SKU</th>
                <th scope="col" className="px-3 py-2 font-medium">Price (optional)</th>
                <th scope="col" className="px-3 py-2 font-medium">Stock</th>
                <th scope="col" className="px-3 py-2 font-medium">On sale</th>
                <th scope="col" className="px-3 py-2"><span className="sr-only">Remove</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="px-3 py-2 font-medium">{labelFor(row)}</td>
                  <td className="px-3 py-2">
                    <Input aria-label={`SKU for ${labelFor(row)}`} value={row.sku} maxLength={64} onChange={(e) => updateRow(row.key, { sku: e.target.value })} className="h-9 w-32" />
                  </td>
                  <td className="px-3 py-2">
                    <Input aria-label={`Price for ${labelFor(row)}`} type="number" inputMode="decimal" min={0} step="0.01" placeholder={price || "Same"} value={row.price} onChange={(e) => updateRow(row.key, { price: e.target.value })} className="h-9 w-28" />
                  </td>
                  <td className="px-3 py-2">
                    <Input aria-label={`Stock for ${labelFor(row)}`} type="number" inputMode="numeric" min={0} step={1} value={row.stock} onChange={(e) => updateRow(row.key, { stock: e.target.value })} className={cn("h-9 w-24", Number(row.stock) === 0 && "ring-danger/50")} />
                  </td>
                  <td className="px-3 py-2">
                    <input type="checkbox" className="size-4 accent-brand" checked={row.isActive} onChange={(e) => updateRow(row.key, { isActive: e.target.checked })} aria-label={`${labelFor(row)} is visible`} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    {rows.length > 1 ? (
                      <button type="button" className="rounded p-1.5 text-danger hover:bg-danger-soft" onClick={() => setRows((c) => c.filter((r) => r.key !== row.key))} aria-label={`Remove ${labelFor(row)}`}>
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
        <Button size="lg" onClick={save} disabled={saving || preparing}>
          {saving ? <Loader2 className="size-5 animate-spin" aria-hidden /> : null}
          {saving ? (progress ?? "Saving…") : "Save product"}
        </Button>
        <Button size="lg" variant="secondary" onClick={() => router.push("/admin/products")} disabled={saving}>
          Cancel
        </Button>
        {productId && !confirmDelete ? (
          <Button size="lg" variant="ghost" className="ml-auto text-danger" onClick={() => setConfirmDelete(true)} disabled={saving}>
            Delete product
          </Button>
        ) : null}
        {confirmDelete ? (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm">Delete this product and its photos?</span>
            <Button variant="danger" onClick={deleteProduct} disabled={saving}>
              Yes, delete
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={saving}>
              Keep
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
