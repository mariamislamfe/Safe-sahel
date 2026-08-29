export default function SearchLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-xl px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <div className="h-8 w-48 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-surface-soft" />
      </div>

      <div className="h-10 w-32 animate-pulse rounded-full bg-surface-soft" />

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 overflow-hidden rounded-xl border border-border"
          >
            <div className="aspect-[4/3] w-full animate-pulse bg-surface-soft" />
            <div className="flex flex-col gap-2 p-md">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-soft" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-soft" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-surface-soft" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
