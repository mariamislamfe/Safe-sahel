import { percentChange } from "@safe-sahel/utils";
import type { WeeklyKpiRow } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { compoundList } from "@/lib/queries/admin";
import { ChipRow, PageHeader, Table, Td, Th, Tr } from "@/components/admin/ui";

type Metric = keyof Omit<WeeklyKpiRow, "week_start">;

function Change({ cur, prev }: { cur: number; prev: number }) {
  const pct = percentChange(cur, prev);
  if (pct === null) return <span className="text-xs text-turquoise-dark">new</span>;
  return (
    <span
      className={`text-xs font-semibold ${pct > 0 ? "text-turquoise-dark" : pct < 0 ? "text-red-600" : "text-ink-secondary"}`}
    >
      {pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} {Math.abs(pct)}%
    </span>
  );
}

export default async function AdminKpisPage(props: PageProps<"/admin/kpis">) {
  await requireSection("kpis");
  const params = await props.searchParams;
  const compoundId = typeof params.c === "string" ? params.c : "";
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].kpis;
  const [compounds, { data, error }] = await Promise.all([
    compoundList(),
    supabase.rpc("admin_weekly_kpis", { p_weeks: 9, p_compound_id: compoundId || null }),
  ]);
  const weeks = data ?? [];
  const metrics: { key: Metric; label: string }[] = [
    { key: "new_listings", label: t.newListings },
    { key: "verified_listings", label: t.verifiedListings },
    { key: "site_visits", label: t.visits },
    { key: "booking_requests", label: t.requests },
    { key: "confirmed_bookings", label: t.confirmed },
  ];
  const latest = weeks[weeks.length - 1];
  const previous = weeks[weeks.length - 2];
  const shown = weeks.slice(1).reverse(); // newest first; first row only feeds WoW

  return (
    <>
      <PageHeader title={t.title} description={t.body} />
      <ChipRow
        items={[
          {
            href: "/admin/kpis",
            label: adminDict[locale].subscriptions.allCompounds,
            active: !compoundId,
          },
          ...compounds.map((c) => ({
            href: `/admin/kpis?c=${c.id}`,
            label: `${c.is_focus ? "★ " : ""}${locale === "ar" && c.name_ar ? c.name_ar : c.name}`,
            active: compoundId === c.id,
          })),
        ]}
      />
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {latest && (
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-3 lg:grid-cols-5">
          {metrics.map((m) => (
            <div
              key={m.key}
              className="flex flex-col gap-xs rounded-2xl border border-border bg-surface p-lg shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
            >
              <span className="text-sm text-ink-secondary">{m.label}</span>
              <span className="font-display text-3xl font-bold tabular-nums">{latest[m.key]}</span>
              {previous && (
                <span className="flex items-center gap-xs">
                  <Change cur={latest[m.key]} prev={previous[m.key]} />
                  <span className="text-[11px] text-ink-secondary">{t.wow}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <Table minWidth={760}>
        <thead>
          <tr>
            <Th>{t.week}</Th>
            {metrics.map((m) => (
              <Th key={m.key} end>
                {m.label}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((w) => {
            const idx = weeks.indexOf(w);
            const prev = weeks[idx - 1];
            return (
              <Tr key={w.week_start}>
                <Td className="whitespace-nowrap font-medium">{date(locale, w.week_start)}</Td>
                {metrics.map((m) => (
                  <Td key={m.key} end className="tabular-nums">
                    {w[m.key]} {prev && <Change cur={w[m.key]} prev={prev[m.key]} />}
                  </Td>
                ))}
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
