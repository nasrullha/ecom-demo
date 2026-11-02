"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { expireStaleOrdersAction, updateOrderStatusAction } from "@/actions/admin-orders";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import type { OrderStatus } from "@/lib/types";

/** Buttons that move an order to its next allowed status. */
export function OrderStatusPanel({ orderId, status }: { orderId: string; status: OrderStatus }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canApprove = status === "slip_uploaded";
  const canDeliver = status === "approved";
  const canReject = status === "pending" || status === "slip_uploaded" || status === "approved";

  if (!canApprove && !canDeliver && !canReject) {
    return <p className="text-sm text-muted">This order is finished. No further changes are possible.</p>;
  }

  function change(next: OrderStatus) {
    setError(null);
    setDone(null);
    startTransition(async () => {
      const result = await updateOrderStatusAction({ orderId, status: next, note: note.trim() || undefined });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNote("");
      setDone("Order updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? <Alert>{error}</Alert> : null}
      {done ? <Alert tone="success">{done}</Alert> : null}

      <Field
        label="Note to the customer"
        htmlFor="status-note"
        hint="Optional for approval. Required when rejecting. Shown on the customer's order page."
      >
        <Textarea id="status-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} />
      </Field>

      <div className="flex flex-wrap gap-2">
        {canApprove ? (
          <Button onClick={() => change("approved")} disabled={pending}>
            Approve payment
          </Button>
        ) : null}
        {canDeliver ? (
          <Button onClick={() => change("delivered")} disabled={pending}>
            Mark as delivered
          </Button>
        ) : null}
        {canReject ? (
          <Button variant="danger" onClick={() => change("rejected")} disabled={pending}>
            Reject order
          </Button>
        ) : null}
      </div>
      {canReject ? <p className="text-xs text-muted">Rejecting puts the items back in stock.</p> : null}
    </div>
  );
}

/** Frees up stock that is stuck in orders nobody paid for. */
export function ExpireOrdersButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState("72");
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Release unpaid orders
      </Button>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-2 rounded-xl bg-surface p-4 ring-1 ring-line sm:w-auto">
      {message ? <Alert tone={message.tone}>{message.text}</Alert> : null}
      <p className="text-sm">
        Reject orders with no payment slip that are older than{" "}
        <input
          aria-label="Hours"
          type="number"
          min={1}
          max={1440}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="mx-1 h-8 w-16 rounded-md px-2 text-center ring-1 ring-inset ring-line"
        />{" "}
        hours, and put their items back in stock.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await expireStaleOrdersAction(Number(hours));
              if (!result.ok) {
                setMessage({ tone: "error", text: result.error });
                return;
              }
              setMessage({
                tone: "success",
                text: result.count === 0 ? "No unpaid orders to release." : `Released ${result.count} order${result.count === 1 ? "" : "s"}.`,
              });
              router.refresh();
            })
          }
        >
          {pending ? "Working…" : "Release"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </div>
  );
}
