import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { money, monthName, num } from "@/lib/i18n/format";

type Row = [string, { count: number; amount: number }];

function RevenueTable({
  rows,
  labels,
  max,
  locale,
}: {
  rows: Row[];
  labels: string[];
  max: number;
  locale: "en" | "ar";
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={k} className="border-t border-border first:border-t-0">
              <td className="p-md">{labels[i]}</td>
              <td className="p-md text-end tabular-nums text-ink-secondary">{num(v.count)}</td>
              <td className="w-1/3 p-md">
                <div className="h-2 rounded-full bg-surface-soft">
                  <div
                    className="h-full rounded-full bg-turquoise"
                    style={{ width: `${(v.amount / max) * 100}%` }}
                  />
                </div>
              </td>
              <td className="p-md text-end font-medium tabular-nums">{money(locale, v.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminFinancePage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].finance;
  const plans = ownerDict[locale].subscription.plans;
  const { data: payments } = await supabase
    .from("subscription_payments")
    .select("kind, plan, amount_egp, reviewed_at")
    .eq("status", "approved");

  const monthKey = (iso: string) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Africa/Cairo",
      year: "numeric",
      month: "2-digit",
    }).format(new Date(iso));
  const byMonth = new Map<string, { count: number; amount: number }>();
  const byPlan = new Map<string, { count: number; amount: number }>();
  let total = 0;
  for (const p of payments ?? []) {
    total += p.amount_egp;
    const m = monthKey(p.reviewed_at ?? new Date().toISOString());
    const pm = byMonth.get(m) ?? { count: 0, amount: 0 };
    byMonth.set(m, { count: pm.count + 1, amount: pm.amount + p.amount_egp });
    const key = p.kind === "featured" ? "featured" : (p.plan ?? "other");
    const pp = byPlan.get(key) ?? { count: 0, amount: 0 };
    byPlan.set(key, { count: pp.count + 1, amount: pp.amount + p.amount_egp });
  }
  const months = [...byMonth.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const max = Math.max(1, ...months.map(([, v]) => v.amount));

  const planRows = [...byPlan.entries()].sort((a, b) => b[1].amount - a[1].amount);

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.body}</p>
      </div>
      <div className="rounded-3xl bg-ink p-lg text-white">
        <p className="text-sm text-white/70">{t.total}</p>
        <p className="font-display text-4xl font-extrabold tabular-nums">{money(locale, total)}</p>
      </div>
      <section className="flex flex-col gap-sm">
        <h2 className="font-display text-lg font-semibold">{t.byMonth}</h2>
        <RevenueTable
          rows={months}
          max={max}
          locale={locale}
          labels={months.map(([k]) => monthName(locale, new Date(`${k}-15T12:00:00Z`)))}
        />
      </section>
      <section className="flex flex-col gap-sm">
        <h2 className="font-display text-lg font-semibold">{t.byPlan}</h2>
        <RevenueTable
          rows={planRows}
          max={max}
          locale={locale}
          labels={planRows.map(([k]) => (k === "featured" ? t.featured : (plans[k]?.name ?? k)))}
        />
      </section>
    </div>
  );
}
