import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { compoundList } from "@/lib/queries/admin";
import { getPlatformSetting } from "@/lib/queries/owner-dashboard";

type Target = { total: number; milestones: { date: string; count: number }[] };

export default async function AdminTargetsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].targets;
  const [target, compounds, { data: live }] = await Promise.all([
    getPlatformSetting<Target>("verified_target", { total: 100, milestones: [] }),
    compoundList(),
    // Every live listing has a verified owner / approved broker (DB publish rule).
    supabase
      .from("properties")
      .select("id, compound_id")
      .eq("status", "published")
      .is("deleted_at", null),
  ]);
  const current = live?.length ?? 0;
  const byCompound = new Map<string, number>();
  for (const p of live ?? [])
    if (p.compound_id) byCompound.set(p.compound_id, (byCompound.get(p.compound_id) ?? 0) + 1);
  const focus = compounds.filter((c) => c.is_focus);
  const focusTotal = focus.reduce((s, c) => s + (byCompound.get(c.id) ?? 0), 0);
  // TODO(founder): per-compound targets aren't specified — we show an even split of the overall target.
  const perCompoundTarget = Math.ceil(target.total / Math.max(focus.length, 1));
  const today = new Date().toISOString().slice(0, 10);
  const nextMilestone = target.milestones.find((m) => m.date >= today);
  const pct = Math.min(100, Math.round((current / Math.max(target.total, 1)) * 100));
  const last = target.milestones[target.milestones.length - 1];

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">
          {t.body(target.total, last ? date(locale, last.date) : "—")}
        </p>
      </div>

      <div className="flex flex-col gap-sm rounded-3xl bg-ink p-lg text-white">
        <p className="text-sm text-white/70">{t.current}</p>
        <p className="font-display text-5xl font-extrabold tabular-nums">
          {current}
          <span className="text-2xl text-white/50"> / {target.total}</span>
        </p>
        <div className="relative h-3 overflow-hidden rounded-full bg-white/15">
          <div
            className="absolute inset-y-0 start-0 rounded-full bg-turquoise"
            style={{ width: `${pct}%` }}
          />
          {target.milestones.map((m) => (
            <span
              key={m.date}
              className="absolute inset-y-0 w-0.5 bg-butter"
              style={{ insetInlineStart: `${(m.count / target.total) * 100}%` }}
            />
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="bg-surface-soft text-ink-secondary">
            <tr>
              <th className="p-md text-start font-medium">{t.milestone}</th>
              <th className="p-md text-start font-medium">{t.due}</th>
              <th className="p-md text-end font-medium">{t.target}</th>
              <th className="p-md text-start font-medium">{t.status}</th>
            </tr>
          </thead>
          <tbody>
            {target.milestones.map((m, i) => {
              const status =
                current >= m.count
                  ? "hit"
                  : m.date < today
                    ? "behind"
                    : m === nextMilestone
                      ? "onTrack"
                      : "upcoming";
              const style = {
                hit: "text-turquoise-dark",
                behind: "text-red-600",
                onTrack: "text-ink",
                upcoming: "text-ink-secondary",
              }[status];
              return (
                <tr key={m.date} className="border-t border-border">
                  <td className="p-md">#{i + 1}</td>
                  <td className="p-md">{date(locale, m.date)}</td>
                  <td className="p-md text-end tabular-nums">{m.count}</td>
                  <td className={`p-md font-medium ${style}`}>
                    {status === "onTrack"
                      ? current >= m.count * 0.5
                        ? t.onTrack
                        : t.behind
                      : t[status as "hit" | "behind" | "upcoming"]}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.perCompound}</h2>
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-5">
          {focus.map((c) => {
            const n = byCompound.get(c.id) ?? 0;
            return (
              <div
                key={c.id}
                className="flex flex-col gap-xs rounded-2xl border border-border p-md"
              >
                <p className="text-sm font-semibold">
                  {locale === "ar" && c.name_ar ? c.name_ar : c.name}
                </p>
                <p className="font-display text-2xl font-bold tabular-nums">
                  {n}
                  <span className="text-sm text-ink-secondary"> / {perCompoundTarget}</span>
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-surface-soft">
                  <div
                    className="h-full rounded-full bg-turquoise"
                    style={{ width: `${Math.min(100, (n / perCompoundTarget) * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-sm text-ink-secondary">
          {t.otherCompounds}: {current - focusTotal}
        </p>
      </section>
    </div>
  );
}
