import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Shows a price (or "from X" for a range), with the old price crossed out if on sale. */
export function Price({
  min,
  max,
  compareAt,
  className,
}: {
  min: number;
  max?: number;
  compareAt?: number | null;
  className?: string;
}) {
  const hasRange = max !== undefined && max > min;
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-2", className)}>
      <span className="font-semibold tabular-nums">
        {hasRange ? "From " : ""}
        {formatMoney(min)}
      </span>
      {compareAt && compareAt > min && !hasRange ? (
        <span className="text-sm text-muted line-through tabular-nums">{formatMoney(compareAt)}</span>
      ) : null}
    </span>
  );
}
