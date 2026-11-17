import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBookings, type OwnerBookingItem } from "@/lib/queries/owner-bookings";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { GuestReviewForm } from "@/components/guest-review-form";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";
import { OwnerRespondButtons } from "@/components/owner-booking-actions";
import { EmptyState, FilterTabs, PageHeader, Pill, Thumb } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

type Tab = "pending" | "upcoming" | "past";

export default async function OwnerBookingsPage(props: PageProps<"/owner/bookings">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].bookings;
  const c = common[locale];
  const params = await props.searchParams;
  const bookings = await getOwnerBookings(user.id);

  const { data: reviewedRows } = bookings.length
    ? await supabase
        .from("guest_reviews")
        .select("booking_id")
        .in(
          "booking_id",
          bookings.map((b) => b.id),
        )
    : { data: [] as { booking_id: string }[] };
  const reviewed = new Set((reviewedRows ?? []).map((r) => r.booking_id));
  const today = new Date().toISOString().slice(0, 10);

  const pending = bookings
    .filter((b) => b.status === "pending")
    .sort((a, b) => (a.expiresAt ?? "").localeCompare(b.expiresAt ?? ""));
  const upcoming = bookings
    .filter((b) => b.status === "confirmed" && b.checkOut >= today)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  const past = bookings.filter((b) => !pending.includes(b) && !upcoming.includes(b));

  // Land on whatever needs the host first.
  const requested = params.tab;
  const tab: Tab =
    requested === "pending" || requested === "upcoming" || requested === "past"
      ? requested
      : pending.length > 0
        ? "pending"
        : "upcoming";

  const lists: Record<Tab, OwnerBookingItem[]> = { pending, upcoming, past };
  const empties: Record<Tab, string> = {
    pending: t.pendingEmpty,
    upcoming: t.upcomingEmpty,
    past: t.pastEmpty,
  };
  const current = lists[tab];

  return (
    <>
      <PageHeader title={t.title} description={t.pendingHint} />

      <FilterTabs
        items={[
          {
            href: "/owner/bookings?tab=pending",
            label: t.pendingTitle,
            active: tab === "pending",
            count: pending.length,
          },
          {
            href: "/owner/bookings?tab=upcoming",
            label: t.upcomingTitle,
            active: tab === "upcoming",
            count: upcoming.length,
          },
          {
            href: "/owner/bookings?tab=past",
            label: t.pastTitle,
            active: tab === "past",
            count: past.length,
          },
        ]}
      />

      {current.length === 0 ? (
        <EmptyState icon={tab === "pending" ? "check" : "calendar"} title={empties[tab]} />
      ) : (
        <div className="flex flex-col gap-sm">
          {current.map((b) => (
            <article
              key={b.id}
              className={`flex flex-col gap-md rounded-2xl border bg-surface p-lg shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${
                b.status === "pending" ? "border-amber-200" : "border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-sm">
                <div className="flex min-w-0 items-center gap-md">
                  <Thumb src={b.coverImageUrl} alt={b.propertyTitle} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <p className="font-semibold">{b.guestName ?? t.guest}</p>
                    <Link
                      href={`/owner/bookings/${b.id}`}
                      className="truncate text-sm text-ink-secondary hover:text-turquoise-dark"
                    >
                      {b.propertyTitle}
                    </Link>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-xs">
                  {b.status === "pending" && b.expiresAt ? (
                    <ExpiryCountdown expiresAt={b.expiresAt} prefix={t.replyWithin} />
                  ) : (
                    <BookingStatusBadge status={b.status} />
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-sm rounded-xl bg-surface-soft/70 p-md text-sm sm:grid-cols-4">
                <div className="col-span-2 flex flex-col">
                  <dt className="text-xs text-ink-secondary">{c.nights(b.nights)}</dt>
                  <dd className="font-medium">
                    {date(locale, b.checkIn)} → {date(locale, b.checkOut)}
                  </dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-ink-secondary">{c.guests(b.guestsCount)}</dt>
                  <dd className="font-mono text-xs">{b.reference}</dd>
                </div>
                <div className="flex flex-col">
                  <dt className="text-xs text-ink-secondary">{t.value}</dt>
                  <dd className="font-semibold tabular-nums">{money(locale, b.basePrice)}</dd>
                </div>
              </dl>

              {b.guestNote && (
                <p className="rounded-xl border border-border px-md py-sm text-sm text-ink-secondary">
                  <span className="font-medium text-ink">{t.note}:</span> {b.guestNote}
                </p>
              )}

              {b.status === "pending" && <OwnerRespondButtons bookingId={b.id} />}

              {tab === "upcoming" && (
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <div className="flex flex-wrap gap-xs">
                    <Pill tone={b.idsUploaded >= b.adultsCount ? "success" : "warn"}>
                      {t.ids(b.idsUploaded, b.adultsCount)}
                    </Pill>
                    {b.checklistDone && <Pill tone="success">{t.checklistDone}</Pill>}
                  </div>
                  <Link
                    href={`/owner/bookings/${b.id}`}
                    className="flex items-center gap-xs text-sm font-semibold text-turquoise-dark"
                  >
                    {t.open}
                    <Icon name="arrow" className="size-4 rtl:-scale-x-100" />
                  </Link>
                </div>
              )}

              {b.status === "confirmed" && b.checkOut < today && !reviewed.has(b.id) && (
                <GuestReviewForm bookingId={b.id} ownerId={user.id} guestId={b.guestId} />
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
}
