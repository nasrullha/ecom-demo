"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/actions/admin-products";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import type { StoreSettings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();

    const shippingFee = Number(get("shippingFee") || "0");
    const freeAbove = get("freeShippingThreshold");
    const lowStock = Number(get("lowStockThreshold") || "0");
    if (!Number.isFinite(shippingFee) || (freeAbove !== "" && !Number.isFinite(Number(freeAbove)))) {
      setError("Shipping amounts must be numbers.");
      return;
    }

    startTransition(async () => {
      const result = await saveSettingsAction({
        storeName: get("storeName"),
        bankName: get("bankName") || undefined,
        accountName: get("accountName") || undefined,
        accountNumber: get("accountNumber") || undefined,
        paymentInstructions: get("paymentInstructions") || undefined,
        shippingFee,
        freeShippingThreshold: freeAbove === "" ? null : Number(freeAbove),
        lowStockThreshold: lowStock,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-6">
      {error ? <Alert>{error}</Alert> : null}
      {saved ? <Alert tone="success">Settings saved.</Alert> : null}

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Store</h2>
        <Field label="Store name" htmlFor="storeName">
          <Input id="storeName" name="storeName" defaultValue={settings.store_name} maxLength={80} required />
        </Field>
        <Field label="Low-stock warning at" htmlFor="lowStockThreshold" hint="The dashboard lists items with this many units left, or fewer.">
          <Input id="lowStockThreshold" name="lowStockThreshold" type="number" min={0} step={1} defaultValue={settings.low_stock_threshold} className="max-w-32" />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-lg font-semibold">Bank details for payments</h2>
          <p className="text-sm text-muted">Customers see these after they place an order, so they know where to transfer the money.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bank name" htmlFor="bankName">
            <Input id="bankName" name="bankName" defaultValue={settings.bank_name ?? ""} maxLength={100} />
          </Field>
          <Field label="Account name" htmlFor="accountName">
            <Input id="accountName" name="accountName" defaultValue={settings.account_name ?? ""} maxLength={100} />
          </Field>
        </div>
        <Field label="Account number" htmlFor="accountNumber">
          <Input id="accountNumber" name="accountNumber" defaultValue={settings.account_number ?? ""} maxLength={60} />
        </Field>
        <Field label="Extra payment instructions (optional)" htmlFor="paymentInstructions">
          <Textarea id="paymentInstructions" name="paymentInstructions" defaultValue={settings.payment_instructions ?? ""} maxLength={1000} rows={4} />
        </Field>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold">Shipping</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Shipping fee" htmlFor="shippingFee" hint="Added to every order. Use 0 for free shipping.">
            <Input id="shippingFee" name="shippingFee" type="number" min={0} step="0.01" defaultValue={settings.shipping_fee} required />
          </Field>
          <Field label="Free shipping above (optional)" htmlFor="freeShippingThreshold" hint="Leave empty to always charge the shipping fee.">
            <Input id="freeShippingThreshold" name="freeShippingThreshold" type="number" min={0} step="0.01" defaultValue={settings.free_shipping_threshold ?? ""} />
          </Field>
        </div>
      </Card>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
