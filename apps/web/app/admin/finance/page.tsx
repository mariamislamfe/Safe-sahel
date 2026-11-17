import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { money, monthName, num } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { EmptyState, PageHeader, Section, Table, Td, Th, Tr } from "@/components/admin/ui";

type Row = [string, { count: number; amount: number }];

function RevenueTable({
  rows,
  labels,
  max,
  locale,
  head,
}: {
  rows: Row[];
  labels: string[];
  max: number;
  locale: "en" | "ar";
  head: { label: string; count: string; amount: string };
}) {
  return (
    <Table minWidth={480}>
      <thead>
        <tr>
          <Th>{head.label}</Th>
          <Th end>{head.count}</Th>
          <Th />
          <Th end>{head.amount}</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v], i) => (
          <Tr key={k}>
            <Td className="font-medium">{labels[i]}</Td>
            <Td end className="tabular-nums text-ink-secondary">
              {num(v.count)}
            </Td>
            <Td className="w-1/3">
              <div className="h-2 rounded-full bg-surface-soft">
                <div
                  className="h-full rounded-full bg-turquoise"
                  style={{ width: `${(v.amount / max) * 100}%` }}
                />
              </div>
            </Td>
            <Td end className="font-semibold tabular-nums">
              {money(locale, v.amount)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export default async function AdminFinancePage() {
  await requireSection("finance");
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
    <>
      <PageHeader title={t.title} description={t.body} />
      <div className="flex flex-col gap-xs rounded-3xl bg-ink p-xl text-white shadow-lg">
        <p className="text-sm text-white/70">{t.total}</p>
        <p className="font-display text-4xl font-extrabold tabular-nums">{money(locale, total)}</p>
        <p className="text-xs text-white/60">
          {num((payments ?? []).length)} {t.count}
        </p>
      </div>
      {months.length === 0 ? (
        <EmptyState icon="wallet" title={common[locale].noResults} />
      ) : (
        <>
          <Section title={t.byMonth}>
            <RevenueTable
              rows={months}
              max={max}
              locale={locale}
              head={{ label: t.month, count: t.count, amount: t.amount }}
              labels={months.map(([k]) => monthName(locale, new Date(`${k}-15T12:00:00Z`)))}
            />
          </Section>
          <Section title={t.byPlan}>
            <RevenueTable
              rows={planRows}
              max={max}
              locale={locale}
              head={{ label: "", count: t.count, amount: t.amount }}
              labels={planRows.map(([k]) =>
                k === "featured" ? t.featured : (plans[k]?.name ?? k),
              )}
            />
          </Section>
        </>
      )}
    </>
  );
}
