export default function PropertyDetailLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-2xl px-lg py-2xl">
      <div className="grid grid-cols-1 gap-1.5 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
        <div className="aspect-[16/10] w-full animate-pulse bg-surface-soft sm:col-span-2 sm:row-span-2 sm:aspect-auto" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="hidden aspect-square w-full animate-pulse bg-surface-soft sm:block"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-2xl lg:grid-cols-3">
        <div className="flex flex-col gap-md lg:col-span-2">
          <div className="h-8 w-2/3 animate-pulse rounded bg-surface-soft" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-surface-soft" />
          <div className="h-4 w-full animate-pulse rounded bg-surface-soft" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-surface-soft" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-surface-soft lg:col-span-1" />
      </div>
    </main>
  );
}
