"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCategoryAction, saveCategoryAction } from "@/actions/admin-products";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import type { Category } from "@/lib/types";

function CategoryRow({ category }: { category?: Category }) {
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sort_order ?? 0));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveCategoryAction({
        id: category?.id,
        name,
        description: description.trim() || undefined,
        sortOrder: Number(sortOrder) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!category) {
        setName("");
        setDescription("");
        setSortOrder("0");
      }
      setSaved(true);
      router.refresh();
    });
  }

  function remove() {
    if (!category) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(category.id);
      if (!result.ok) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.refresh();
    });
  }

  const id = category?.id ?? "new";

  return (
    <div className="space-y-3">
      {error ? <Alert>{error}</Alert> : null}
      <div className="grid gap-3 md:grid-cols-[1fr_2fr_6rem_auto] md:items-end">
        <Field label="Name" htmlFor={`c-name-${id}`}>
          <Input id={`c-name-${id}`} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
        </Field>
        <Field label="Short description (optional)" htmlFor={`c-desc-${id}`}>
          <Input id={`c-desc-${id}`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </Field>
        <Field label="Order" htmlFor={`c-order-${id}`}>
          <Input id={`c-order-${id}`} type="number" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
        </Field>
        <div className="flex gap-2">
          <Button onClick={save} disabled={pending || !name.trim()}>
            {pending ? "Saving…" : category ? (saved ? "Saved" : "Save") : "Add category"}
          </Button>
          {category && !confirming ? (
            <Button variant="ghost" className="text-danger" onClick={() => setConfirming(true)} disabled={pending}>
              Delete
            </Button>
          ) : null}
        </div>
      </div>
      {confirming ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-wash p-3 text-sm">
          <span>Delete this category? Its products stay in the shop without a category.</span>
          <Button variant="danger" size="sm" onClick={remove} disabled={pending}>
            Yes, delete
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)}>
            Keep
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function CategoryManager({ categories }: { categories: Category[] }) {
  return (
    <div className="max-w-4xl space-y-6">
      <Card className="p-5">
        <h2 className="mb-3 text-lg font-semibold">Add a category</h2>
        <CategoryRow />
      </Card>

      <Card className="divide-y divide-line">
        {categories.length === 0 ? (
          <p className="p-5 text-sm text-muted">No categories yet. Add your first one above.</p>
        ) : (
          categories.map((c) => (
            <div key={c.id} className="p-5">
              <CategoryRow category={c} />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
