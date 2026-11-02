import { Check } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatDateTime, STATUS_META } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderEvent, OrderStatus } from "@/lib/types";

export function OrderStatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return <Badge className={cn(STATUS_META[status].badge, className)}>{STATUS_META[status].label}</Badge>;
}

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order placed" },
  { status: "slip_uploaded", label: "Slip uploaded" },
  { status: "approved", label: "Approved" },
  { status: "delivered", label: "Delivered" },
];

/** Horizontal progress: placed -> slip uploaded -> approved -> delivered. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === "rejected") return null;
  const current = STEPS.findIndex((s) => s.status === status);

  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Order progress">
      {STEPS.map((step, i) => {
        const done = i < current || status === "delivered";
        const active = i === current && status !== "delivered";
        return (
          <li key={step.status} className="text-center" aria-current={active ? "step" : undefined}>
            <div
              className={cn(
                "mx-auto flex size-8 items-center justify-center rounded-full text-sm font-medium",
                done ? "bg-brand text-white" : active ? "bg-brand-soft text-brand-strong ring-2 ring-brand" : "bg-wash text-muted"
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </div>
            <p className={cn("mt-1.5 text-xs", done || active ? "font-medium text-ink" : "text-muted")}>{step.label}</p>
          </li>
        );
      })}
    </ol>
  );
}

export function OrderTimeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) return null;
  const sorted = [...events].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return (
    <ol className="space-y-3 text-sm">
      {sorted.map((e) => (
        <li key={e.id} className="flex gap-3">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" aria-hidden />
          <div>
            <p>
              <span className="font-medium">{STATUS_META[e.to_status].label}</span>
              {e.note ? <span className="text-muted"> · {e.note}</span> : null}
            </p>
            <p className="text-xs text-muted">{formatDateTime(e.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
