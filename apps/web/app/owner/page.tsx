import { redirect } from "next/navigation";
import { daysSince, percentChange } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { dashboardDict } from "@/lib/i18n/dashboard";
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
import {
  ActionRow,
  Card,
  EmptyState,
  PageHeader,
  Pill,
  Progress,
  Section,
  StatCard,
  StepList,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/admin/ui";

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
  if (pct === null) return <span>{label("+∞")}</span>;
  const tone = pct > 0 ? "text-turquoise-dark" : pct < 0 ? "text-red-600" : "";
  return (
    <span className={`font-medium ${tone}`}>
      {label(`${pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} ${Math.abs(pct)}%`)}
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
  const d = dashboardDict[locale].host;
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

  // Onboarding: the shortest path from sign-up to a first live listing.
  const verifyPending =
    !profile.verified &&
    (verification?.status === "pending" || verification?.status === "contacted");
  const firstListing = listings[0];
  const steps = [
    {
      label: d.steps.phone,
      body: d.steps.phoneBody,
      done: !!profile.phone,
      href: "/profile",
      cta: d.cta.phone,
    },
    {
      label: d.steps.verify,
      body: verifyPending ? d.steps.verifyPending : d.steps.verifyBody,
      done: profile.verified,
      href: "/owner/verification",
      cta: d.cta.verify,
    },
    {
      label: d.steps.listing,
      body: d.steps.listingBody,
      done: listings.length > 0,
      href: "/owner/properties/new",
      cta: d.cta.listing,
    },
    {
      label: d.steps.photos,
      body: d.steps.photosBody,
      done: listings.some((l) => l.photoCount >= 5),
      href: firstListing ? `/owner/properties/${firstListing.id}/photos` : "/owner/properties/new",
      cta: d.cta.photos,
    },
    {
      label: d.steps.publish,
      body: d.steps.publishBody,
      done: live.length > 0,
      href: "/owner/listings",
      cta: d.cta.publish,
    },
  ];
  const stepsDone = steps.filter((s) => s.done).length;
  const setupComplete = stepsDone === steps.length;

  const tiles = [
    { label: t.views, icon: "eye" as const, cur: totals.views, prev: previous.views },
    {
      label: t.whatsapp,
      icon: "phone" as const,
      cur: totals.whatsapp_clicks,
      prev: previous.whatsapp_clicks,
    },
    {
      label: t.requests,
      icon: "inbox" as const,
      cur: totals.booking_requests,
      prev: previous.booking_requests,
    },
    {
      label: t.confirmed,
      icon: "check" as const,
      cur: totals.confirmed_bookings,
      prev: previous.confirmed_bookings,
    },
  ];

  const calendarStale = oldestCalendar !== null && oldestCalendar >= 7;
  const verifyNudge = setupComplete && !profile.verified;
  const hasAttention = pending > 0 || calendarStale || verifyNudge;

  return (
    <>
      <PageHeader
        title={d.greeting(profile.fullName?.split(" ")[0] ?? "")}
        description={date(locale, new Date().toISOString())}
      />

      {!setupComplete && (
        <Card className="flex flex-col gap-md">
          <div className="flex flex-col gap-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-sm">
              <h2 className="font-display text-lg font-semibold">{d.setupTitle}</h2>
              <span className="text-sm text-ink-secondary">
                {d.setupBody(stepsDone, steps.length)}
              </span>
            </div>
            <Progress value={(stepsDone / steps.length) * 100} />
          </div>
          <StepList steps={steps} />
        </Card>
      )}

      {(hasAttention || setupComplete) && (
        <Section title={d.attention}>
          {!hasAttention ? (
            <EmptyState icon="check" title={d.allClear} body={d.allClearBody} />
          ) : (
            <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
              {pending > 0 && (
                <ActionRow
                  href="/owner/bookings"
                  icon="inbox"
                  tone="urgent"
                  label={t.pendingAlert(pending)}
                  count={pending}
                  cta={t.reply}
                />
              )}
              {verifyNudge && (
                <ActionRow
                  href="/owner/verification"
                  icon="shield"
                  tone="warn"
                  label={verifyPending ? c.reviewStatus.pending : t.verifyAlert}
                  cta={t.verifyCta}
                />
              )}
              {calendarStale && (
                <ActionRow
                  href="/owner/calendar"
                  icon="calendar"
                  tone="warn"
                  label={t.calendarCta}
                  note={t.calendarAlert(oldestCalendar >= 999 ? "—" : c.daysAgo(oldestCalendar))}
                />
              )}
            </div>
          )}
        </Section>
      )}

      {profile.founding && (
        <div className="flex flex-col gap-xs rounded-2xl bg-ink px-lg py-md text-white sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display font-bold text-butter">{t.founderBadge}</p>
          <p className="text-sm text-white/80">{t.founderPerks}</p>
        </div>
      )}

      <Section
        title={d.report}
        description={t.reportSentence(
          totals.views,
          totals.booking_requests,
          totals.confirmed_bookings,
          money(locale, totals.booking_value),
        )}
        action={
          <span className="text-sm text-ink-secondary">
            {monthName(locale, new Date(report.from))}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-sm lg:grid-cols-4">
          {tiles.map((tile) => (
            <StatCard
              key={tile.label}
              label={tile.label}
              icon={tile.icon}
              value={num(tile.cur)}
              hint={<Delta current={tile.cur} previous={tile.prev} label={t.vsLastMonth} />}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-sm rounded-2xl border border-butter bg-butter-soft p-lg">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm text-ink-secondary">{t.value}</span>
            <span className="font-display text-3xl font-bold tabular-nums">
              {money(locale, totals.booking_value)}
            </span>
          </div>
          <span className="text-xs text-ink-secondary">{t.valueNote}</span>
        </div>
      </Section>

      {listings.length > 0 && (
        <Section title={t.byListing} count={listings.length}>
          <Table minWidth={560}>
            <thead>
              <tr>
                <Th>{t.listing}</Th>
                <Th end>{t.views}</Th>
                <Th end>{t.whatsapp}</Th>
                <Th end>{t.requests}</Th>
                <Th end>{t.confirmed}</Th>
                <Th end>{t.value}</Th>
              </tr>
            </thead>
            <tbody>
              {report.byListing.map((row) => (
                <Tr key={row.property_id}>
                  <Td className="font-medium">{titleById.get(row.property_id) ?? "—"}</Td>
                  <Td end className="tabular-nums">
                    {num(row.views)}
                  </Td>
                  <Td end className="tabular-nums">
                    {num(row.whatsapp_clicks)}
                  </Td>
                  <Td end className="tabular-nums">
                    {num(row.booking_requests)}
                  </Td>
                  <Td end className="tabular-nums">
                    {num(row.confirmed_bookings)}
                  </Td>
                  <Td end className="tabular-nums">
                    {money(locale, row.booking_value)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}

      <div className="grid grid-cols-1 gap-lg md:grid-cols-2">
        <Card className="flex flex-col gap-sm">
          <h2 className="flex items-center gap-sm font-display text-lg font-semibold">
            {t.strikesTitle}
            <Pill
              tone={
                activeStrikes.length >= 2
                  ? "danger"
                  : activeStrikes.length === 1
                    ? "warn"
                    : "success"
              }
            >
              {activeStrikes.length}
            </Pill>
          </h2>
          <p className="text-sm text-ink-secondary">{t.strikesBody}</p>
          {strikes.length > 0 && (
            <ul className="flex flex-col gap-xs text-sm">
              {strikes.map((s) => (
                <li
                  key={s.id}
                  className={s.revoked ? "text-ink-secondary line-through" : "text-red-700"}
                >
                  {t.strikeItem(date(locale, s.createdAt), s.reference)}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="flex flex-col gap-sm">
          <h2 className="font-display text-lg font-semibold">{t.noticesTitle}</h2>
          {notices.length === 0 ? (
            <p className="text-sm text-ink-secondary">—</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border text-sm">
              {notices.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-sm py-sm">
                  <span className="flex items-center gap-sm">
                    <span className="size-1.5 shrink-0 rounded-full bg-turquoise" />
                    {t.notifications[n.kind] ?? n.kind}
                  </span>
                  <span className="shrink-0 text-xs text-ink-secondary">
                    {date(locale, n.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
