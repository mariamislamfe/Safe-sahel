import Link from "next/link";
import { percentChange } from "@safe-sahel/utils";
import type { WeeklyKpiRow } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { compoundList } from "@/lib/queries/admin";

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
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.body}</p>
      </div>
      <div className="-mx-lg flex gap-xs overflow-x-auto px-lg">
        <Link
          href="/admin/kpis"
          className={`shrink-0 rounded-full border px-md py-xs text-xs ${!compoundId ? "border-turquoise bg-turquoise-light" : "border-border"}`}
        >
          {adminDict[locale].subscriptions.allCompounds}
        </Link>
        {compounds.map((c) => (
          <Link
            key={c.id}
            href={`/admin/kpis?c=${c.id}`}
            className={`shrink-0 rounded-full border px-md py-xs text-xs ${compoundId === c.id ? "border-turquoise bg-turquoise-light" : "border-border"}`}
          >
            {c.is_focus && "★ "}
            {locale === "ar" && c.name_ar ? c.name_ar : c.name}
          </Link>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error.message}</p>}

      {latest && (
        <div className="grid grid-cols-2 gap-sm sm:grid-cols-5">
          {metrics.map((m) => (
            <div
              key={m.key}
              className="flex flex-col gap-0.5 rounded-2xl border border-border p-md"
            >
              <span className="font-display text-3xl font-bold tabular-nums">{latest[m.key]}</span>
              <span className="text-xs text-ink-secondary">{m.label}</span>
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

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-surface-soft text-ink-secondary">
            <tr>
              <th className="p-md text-start font-medium">{t.week}</th>
              {metrics.map((m) => (
                <th key={m.key} className="p-md text-end font-medium">
                  {m.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((w) => {
              const idx = weeks.indexOf(w);
              const prev = weeks[idx - 1];
              return (
                <tr key={w.week_start} className="border-t border-border">
                  <td className="whitespace-nowrap p-md">{date(locale, w.week_start)}</td>
                  {metrics.map((m) => (
                    <td key={m.key} className="p-md text-end tabular-nums">
                      {w[m.key]} {prev && <Change cur={w[m.key]} prev={prev[m.key]} />}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
