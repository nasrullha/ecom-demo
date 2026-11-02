"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelOrderAction } from "@/actions/orders";
import { Alert, Button } from "@/components/ui";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        Cancel this order
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-lg bg-wash p-3">
      {error ? <Alert>{error}</Alert> : null}
      <p className="text-sm">Cancel this order? Your items will be released.</p>
      <div className="flex gap-2">
        <Button
          variant="danger"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cancelOrderAction(orderId);
              if (!result.ok) setError(result.error);
              else router.refresh();
            })
          }
        >
          {pending ? "Cancelling…" : "Yes, cancel order"}
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Keep order
        </Button>
      </div>
    </div>
  );
}
