import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { buildQueryString, parseFilters, type ProductFilters } from "@/lib/catalog";
import { getCategories, getFacets, listProducts } from "@/lib/queries";
import { Button, ButtonLink, Checkbox, EmptyState, Input } from "@/components/ui";
import { Pagination } from "@/components/pagination";
import { ProductGrid } from "@/components/shop/product-card";
import { SortSelect } from "@/components/shop/sort-select";

type RawParams = Record<string, string | string[] | undefined>;

/**
 * The product list with search, filters, sorting and pages.
 * Used by /products and /category/[slug]. Everything is stored in the address,
 * so results can be bookmarked, shared and the back button works.
 */
export async function CatalogView({
  params,
  basePath,
  fixedCategory,
  title,
  intro,
}: {
  params: RawParams;
  basePath: string;
  fixedCategory?: string;
  title: string;
  intro?: string | null;
}) {
  const filters = parseFilters(params, fixedCategory);
  const [{ products, total, pageCount }, categories, facets] = await Promise.all([
    listProducts(filters),
    getCategories(),
    getFacets(),
  ]);

  const hrefFor = (page: number) => `${basePath}${buildQueryString(filters, { page }, ["category"])}`;
  const activeCount =
    (filters.min !== undefined ? 1 : 0) +
    (filters.max !== undefined ? 1 : 0) +
    (filters.inStock ? 1 : 0) +
    filters.options.length +
    (!fixedCategory && filters.category ? 1 : 0);

  const clearHref = `${basePath}${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ""}`;

  const filterForm = (
    <form action={basePath} method="get" className="space-y-6">
      {filters.q ? <input type="hidden" name="q" value={filters.q} /> : null}
      {filters.sort !== "newest" ? <input type="hidden" name="sort" value={filters.sort} /> : null}

      {!fixedCategory && categories.length > 0 ? (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Category</legend>
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="radio" name="category" value="" defaultChecked={!filters.category} className="size-4 accent-brand" />
              All
            </label>
            {categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="category"
                  value={c.slug}
                  defaultChecked={filters.category === c.slug}
                  className="size-4 accent-brand"
                />
                {c.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Price</legend>
        <div className="flex items-center gap-2">
          <Input name="min" type="number" inputMode="decimal" min={0} step="any" placeholder="Min" defaultValue={filters.min} aria-label="Minimum price" />
          <span className="text-muted">to</span>
          <Input name="max" type="number" inputMode="decimal" min={0} step="any" placeholder="Max" defaultValue={filters.max} aria-label="Maximum price" />
        </div>
      </fieldset>

      {facets.map((facet) => (
        <fieldset key={facet.name}>
          <legend className="mb-2 text-sm font-semibold">{facet.name}</legend>
          <div className="space-y-1.5">
            {facet.values.map((value) => (
              <Checkbox
                key={value}
                name="opt"
                value={`${facet.name}:${value}`}
                label={value}
                defaultChecked={filters.options.includes(`${facet.name}:${value}`)}
              />
            ))}
          </div>
        </fieldset>
      ))}

      <Checkbox name="stock" value="1" label="In stock only" defaultChecked={filters.inStock} />

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          Apply filters
        </Button>
        {activeCount > 0 ? (
          <ButtonLink href={clearHref} variant="secondary">
            Clear
          </ButtonLink>
        ) : null}
      </div>
    </form>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold">{filters.q ? `Results for “${filters.q}”` : title}</h1>
        {intro && !filters.q ? <p className="mt-2 max-w-2xl text-muted">{intro}</p> : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[15rem_1fr]">
        {/* Desktop: always visible. Mobile: tucked into a disclosure. */}
        <aside aria-label="Filters" className="lg:sticky lg:top-36 lg:self-start">
          <details className="rounded-xl bg-surface ring-1 ring-line lg:hidden" open={activeCount > 0}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium">
              <SlidersHorizontal className="size-4" aria-hidden />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </summary>
            <div className="border-t border-line p-4">{filterForm}</div>
          </details>
          <div className="hidden lg:block">{filterForm}</div>
        </aside>

        <section aria-label="Products">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {total} {total === 1 ? "product" : "products"}
            </p>
            <SortSelect value={filters.sort} />
          </div>

          {products.length > 0 ? (
            <>
              <ProductGrid products={products} />
              <Pagination page={Math.min(filters.page, pageCount)} pageCount={pageCount} hrefFor={hrefFor} />
            </>
          ) : (
            <EmptyState
              title="No products found"
              action={
                <Link href={clearHref} className="text-sm font-medium text-brand underline">
                  Clear filters
                </Link>
              }
            >
              Try a different search or remove some filters.
            </EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}

export type { ProductFilters };
