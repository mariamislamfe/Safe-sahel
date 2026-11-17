import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { compoundList } from "@/lib/queries/admin";
import { getPlatformSetting } from "@/lib/queries/owner-dashboard";
import {
  Card,
  PageHeader,
  Pill,
  Section,
  Table,
  Td,
  Th,
  Tr,
  type PillTone,
} from "@/components/admin/ui";

type Target = { total: number; milestones: { date: string; count: number }[] };
type MilestoneState = "hit" | "behind" | "onTrack" | "upcoming";

const TONE: Record<MilestoneState, PillTone> = {
  hit: "success",
  behind: "danger",
  onTrack: "info",
  upcoming: "neutral",
};

export default async function AdminTargetsPage() {
  await requireSection("targets");
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
    <>
      <PageHeader
        title={t.title}
        description={t.body(target.total, last ? date(locale, last.date) : "—")}
      />

      <div className="flex flex-col gap-md rounded-3xl bg-ink p-xl text-white shadow-lg">
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

      <Table minWidth={480}>
        <thead>
          <tr>
            <Th>{t.milestone}</Th>
            <Th>{t.due}</Th>
            <Th end>{t.target}</Th>
            <Th>{t.status}</Th>
          </tr>
        </thead>
        <tbody>
          {target.milestones.map((m, i) => {
            const state: MilestoneState =
              current >= m.count
                ? "hit"
                : m.date < today
                  ? "behind"
                  : m === nextMilestone
                    ? current >= m.count * 0.5
                      ? "onTrack"
                      : "behind"
                    : "upcoming";
            return (
              <Tr key={m.date}>
                <Td className="font-medium">#{i + 1}</Td>
                <Td>{date(locale, m.date)}</Td>
                <Td end className="tabular-nums">
                  {m.count}
                </Td>
                <Td>
                  <Pill tone={TONE[state]}>{t[state]}</Pill>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <Section title={t.perCompound} description={`${t.otherCompounds}: ${current - focusTotal}`}>
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2 lg:grid-cols-5">
          {focus.map((c) => {
            const n = byCompound.get(c.id) ?? 0;
            return (
              <Card key={c.id}>
                <div className="flex flex-col gap-xs">
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
              </Card>
            );
          })}
        </div>
      </Section>
    </>
  );
}
