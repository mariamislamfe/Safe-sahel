export default function LocationsLoading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-lg px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <div className="h-8 w-64 animate-pulse rounded-md bg-surface-soft" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-surface-soft" />
      </div>
      <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[4/5] w-full animate-pulse rounded-xl bg-surface-soft" />
        ))}
      </div>
    </main>
  );
}
