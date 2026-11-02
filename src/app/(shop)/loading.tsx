export default function Loading() {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label="Loading">
      <div className="h-9 w-64 rounded-lg bg-wash" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[4/5] rounded-lg bg-wash" />
            <div className="h-4 w-3/4 rounded bg-wash" />
            <div className="h-4 w-1/3 rounded bg-wash" />
          </div>
        ))}
      </div>
    </div>
  );
}
