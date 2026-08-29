const buckets = [
  { stars: 5, key: "excellent" },
  { stars: 4, key: "veryGood" },
  { stars: 3, key: "good" },
  { stars: 2, key: "poor" },
  { stars: 1, key: "veryPoor" },
] as const;

export function RatingBreakdown({
  ratings,
  labels,
}: {
  ratings: number[];
  labels: Record<(typeof buckets)[number]["key"], string>;
}) {
  const total = ratings.length;
  if (total === 0) return null;

  const counts = buckets.map(({ stars, key }) => ({
    key,
    count: ratings.filter((r) => Math.round(r) === stars).length,
  }));

  return (
    <div className="flex flex-col gap-xs">
      {counts.map(({ key, count }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <div key={key} className="flex items-center gap-md text-sm">
            <span className="w-24 shrink-0 text-ink-secondary">{labels[key]}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-soft">
              <div className="h-full rounded-full bg-butter" style={{ width: `${pct}%` }} />
            </div>
            <span className="w-6 shrink-0 text-end text-xs text-ink-secondary">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
