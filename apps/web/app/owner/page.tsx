import Link from "next/link";
import { redirect } from "next/navigation";
import { daysSince, percentChange } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { date, money, monthName, num } from "@/lib/i18n/format";
import {
  getLatestVerification,
  getMonthlyReport,
  getMyNotifications,
  getOwnerListings,
  getOwnerPendingCount,
  getOwnerProfile,
  getOwnerStrikes,
} from "@/lib/queries/owner-dashboard";

function Delta({
  current,
  previous,
  label,
}: {
  current: number;
  previous: number;
  label: (s: string) => string;
}) {
  const pct = percentChange(current, previous);
  if (pct === null) return <span className="text-xs text-white/70">{label("+∞")}</span>;
  const up = pct > 0;
  return (
    <span
      className={`text-xs font-medium ${pct === 0 ? "text-white/60" : up ? "text-butter" : "text-white/70"}`}
    >
      {label(`${up ? "▲" : pct < 0 ? "▼" : "•"} ${Math.abs(pct)}%`)}
    </span>
  );
}

export default async function OwnerOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].overview;
  const c = common[locale];

  const [profile, listings, report, pending, strikes, notices, verification] = await Promise.all([
    getOwnerProfile(user.id),
    getOwnerListings(user.id),
    getMonthlyReport(),
    getOwnerPendingCount(user.id),
    getOwnerStrikes(user.id),
    getMyNotifications(user.id),
    getLatestVerification(user.id),
  ]);

  const { totals, previous } = report;
  const titleById = new Map(listings.map((l) => [l.id, l.title]));
  const activeStrikes = strikes.filter((s) => !s.revoked);
  const live = listings.filter((l) => l.status === "published");
  const oldestCalendar = live
    .map((l) => daysSince(l.calendarUpdatedAt))
    .reduce<number | null>((max, d) => (d === null ? (max ?? 999) : Math.max(max ?? 0, d)), null);

  const tiles = [
    { label: t.views, value: num(totals.views), cur: totals.views, prev: previous.views },
    {
      label: t.whatsapp,
      value: num(totals.whatsapp_clicks),
      cur: totals.whatsapp_clicks,
      prev: previous.whatsapp_clicks,
    },
    {
      label: t.requests,
      value: num(totals.booking_requests),
      cur: totals.booking_requests,
      prev: previous.booking_requests,
    },
    {
      label: t.confirmed,
      value: num(totals.confirmed_bookings),
      cur: totals.confirmed_bookings,
      prev: previous.confirmed_bookings,
    },
  ];

  return (
    <div className="flex flex-col gap-xl">
      {/* Monthly report — the main retention surface */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-turquoise-dark via-turquoise-dark to-ink p-lg text-white shadow-lg sm:p-2xl">
        <div
          aria-hidden
          className="absolute -end-16 -top-16 size-56 rounded-full bg-turquoise/30 blur-3xl"
        />
        <div className="relative flex flex-col gap-lg">
          <div className="flex flex-wrap items-center justify-between gap-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-butter">
              {t.title}
            </p>
            <p className="text-sm text-white/70">{monthName(locale, new Date(report.from))}</p>
          </div>
          <p className="text-balance font-display text-xl font-bold leading-snug sm:text-3xl">
            {t.reportSentence(
              totals.views,
              totals.booking_requests,
              totals.confirmed_bookings,
              money(locale, totals.booking_value),
            )}
          </p>
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="flex flex-col gap-0.5 rounded-2xl bg-white/10 p-md backdrop-blur-sm"
              >
                <span className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
                  {tile.value}
                </span>
                <span className="text-xs text-white/80">{tile.label}</span>
                <Delta current={tile.cur} previous={tile.prev} label={t.vsLastMonth} />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-end justify-between gap-sm rounded-2xl bg-butter px-lg py-md text-ink">
            <div>
              <p className="text-xs font-semibold">{t.value}</p>
              <p className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
                {money(locale, totals.booking_value)}
              </p>
            </div>
            <p className="text-xs text-ink/70">{t.valueNote}</p>
          </div>
        </div>
      </section>

      {/* Action alerts */}
      <div className="flex flex-col gap-sm">
        {pending > 0 && (
          <Link
            href="/owner/bookings"
            className="flex items-center justify-between gap-md rounded-2xl border border-red-200 bg-red-50 px-lg py-md"
          >
            <span className="font-medium text-red-800">⏳ {t.pendingAlert(pending)}</span>
            <span className="shrink-0 text-sm font-semibold text-red-700">{t.reply} →</span>
          </Link>
        )}
        {!profile.verified && (
          <Link
            href="/owner/verification"
            className="flex items-center justify-between gap-md rounded-2xl border border-butter bg-butter-soft px-lg py-md"
          >
            <span className="text-sm font-medium text-ink">
              🪪 {verification?.status === "pending" ? c.reviewStatus.pending : t.verifyAlert}
            </span>
            <span className="shrink-0 text-sm font-semibold text-turquoise-dark">
              {t.verifyCta} →
            </span>
          </Link>
        )}
        {oldestCalendar !== null && oldestCalendar >= 7 && (
          <Link
            href="/owner/calendar"
            className="flex items-center justify-between gap-md rounded-2xl border border-border bg-surface-soft px-lg py-md"
          >
            <span className="text-sm text-ink">
              🗓️ {t.calendarAlert(oldestCalendar >= 999 ? "—" : c.daysAgo(oldestCalendar))}
            </span>
            <span className="shrink-0 text-sm font-semibold text-turquoise-dark">
              {t.calendarCta} →
            </span>
          </Link>
        )}
      </div>

      {profile.founding && (
        <div className="flex flex-col gap-xs rounded-2xl border border-ink/10 bg-ink px-lg py-md text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display font-bold text-butter">{t.founderBadge}</p>
          <p className="text-sm text-white/80">{t.founderPerks}</p>
        </div>
      )}

      {/* Per-listing breakdown */}
      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.byListing}</h2>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-xl text-center text-sm text-ink-secondary">
            {t.noListings}{" "}
            <Link href="/owner/properties/new" className="font-medium text-turquoise-dark">
              +
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="bg-surface-soft text-start text-ink-secondary">
                <tr>
                  <th className="p-md text-start font-medium">{t.listing}</th>
                  <th className="p-md text-end font-medium">{t.views}</th>
                  <th className="p-md text-end font-medium">{t.whatsapp}</th>
                  <th className="p-md text-end font-medium">{t.requests}</th>
                  <th className="p-md text-end font-medium">{t.confirmed}</th>
                  <th className="p-md text-end font-medium">{t.value}</th>
                </tr>
              </thead>
              <tbody>
                {report.byListing.map((row) => (
                  <tr key={row.property_id} className="border-t border-border">
                    <td className="p-md font-medium text-ink">
                      {titleById.get(row.property_id) ?? "—"}
                    </td>
                    <td className="p-md text-end tabular-nums">{num(row.views)}</td>
                    <td className="p-md text-end tabular-nums">{num(row.whatsapp_clicks)}</td>
                    <td className="p-md text-end tabular-nums">{num(row.booking_requests)}</td>
                    <td className="p-md text-end tabular-nums">{num(row.confirmed_bookings)}</td>
                    <td className="p-md text-end tabular-nums">
                      {money(locale, row.booking_value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        {/* Strikes */}
        <section className="flex flex-col gap-sm rounded-2xl border border-border p-lg">
          <h2 className="flex items-center gap-sm font-display text-lg font-semibold">
            {t.strikesTitle}
            <span
              className={`rounded-full px-sm text-xs font-bold ${activeStrikes.length >= 2 ? "bg-red-100 text-red-700" : activeStrikes.length === 1 ? "bg-butter-soft text-ink" : "bg-turquoise-light text-turquoise-dark"}`}
            >
              {activeStrikes.length}
            </span>
          </h2>
          <p className="text-sm text-ink-secondary">{t.strikesBody}</p>
          {strikes.length > 0 && (
            <ul className="flex flex-col gap-xs text-sm">
              {strikes.map((s) => (
                <li
                  key={s.id}
                  className={s.revoked ? "text-ink-secondary line-through" : "text-red-700"}
                >
                  ⚠️ {t.strikeItem(date(locale, s.createdAt), s.reference)}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent updates */}
        <section className="flex flex-col gap-sm rounded-2xl border border-border p-lg">
          <h2 className="font-display text-lg font-semibold">{t.noticesTitle}</h2>
          {notices.length === 0 ? (
            <p className="text-sm text-ink-secondary">—</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {notices.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-sm py-xs">
                  <span className="text-ink">{t.notifications[n.kind] ?? n.kind}</span>
                  <span className="shrink-0 text-xs text-ink-secondary">
                    {date(locale, n.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
