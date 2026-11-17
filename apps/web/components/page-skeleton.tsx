/** Shared loading placeholder in the dashboard style (header → stat row → cards). */
export function PageSkeleton({ stats = false, rows = 3 }: { stats?: boolean; rows?: number }) {
  return (
    <div className="flex flex-col gap-xl" aria-busy aria-live="polite">
      <div className="flex flex-col gap-sm">
        <div className="h-8 w-56 max-w-full animate-pulse rounded-lg bg-border/60" />
        <div className="h-4 w-32 animate-pulse rounded bg-border/40" />
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-sm lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex h-28 flex-col justify-between rounded-2xl border border-border bg-surface p-lg"
            >
              <div className="h-3 w-2/3 animate-pulse rounded bg-border/50" />
              <div className="h-7 w-1/3 animate-pulse rounded bg-border/60" />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-sm">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-md rounded-2xl border border-border bg-surface p-lg"
          >
            <div className="size-14 shrink-0 animate-pulse rounded-xl bg-border/50" />
            <div className="flex flex-1 flex-col gap-sm">
              <div className="h-4 w-1/2 animate-pulse rounded bg-border/60" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-border/40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
