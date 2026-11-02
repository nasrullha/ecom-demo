// Reading and building the filter options in the address bar
// (e.g. /products?q=tee&category=apparel&min=10&sort=price_asc).

export type SortKey = "newest" | "price_asc" | "price_desc" | "name";

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name: A to Z" },
];

export interface ProductFilters {
  q?: string;
  category?: string;
  min?: number;
  max?: number;
  inStock?: boolean;
  sort: SortKey;
  /** values look like "Color:Black" */
  options: string[];
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function many(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function toPrice(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n < 100000000 ? n : undefined;
}

export function parseFilters(params: RawParams, fixedCategory?: string): ProductFilters {
  const sortRaw = one(params.sort);
  const sort: SortKey = SORT_OPTIONS.some((o) => o.value === sortRaw) ? (sortRaw as SortKey) : "newest";
  const page = Math.min(500, Math.max(1, Math.floor(Number(one(params.page))) || 1));
  const q = one(params.q)?.trim().slice(0, 100) || undefined;
  const category = fixedCategory ?? (one(params.category)?.trim().slice(0, 100) || undefined);

  return {
    q,
    category,
    min: toPrice(one(params.min)),
    max: toPrice(one(params.max)),
    inStock: one(params.stock) === "1",
    sort,
    options: many(params.opt)
      .filter((o) => /^[^:]{1,30}:.{1,40}$/.test(o))
      .slice(0, 20),
    page,
  };
}

/** Turn filters back into a query string, with optional overrides. */
export function buildQueryString(
  filters: ProductFilters,
  overrides: Partial<ProductFilters> = {},
  omit: string[] = []
): string {
  const f = { ...filters, ...overrides };
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.category && !omit.includes("category")) sp.set("category", f.category);
  if (f.min !== undefined) sp.set("min", String(f.min));
  if (f.max !== undefined) sp.set("max", String(f.max));
  if (f.inStock) sp.set("stock", "1");
  if (f.sort !== "newest") sp.set("sort", f.sort);
  f.options.forEach((o) => sp.append("opt", o));
  if (f.page > 1) sp.set("page", String(f.page));
  const s = sp.toString();
  return s ? `?${s}` : "";
}
