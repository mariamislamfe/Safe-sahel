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

export default async function OwnerBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].bookings;
  const c = common[locale];
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

  const Row = ({ b, children }: { b: OwnerBookingItem; children?: React.ReactNode }) => (
    <div className="flex flex-col gap-sm rounded-2xl border border-border p-md">
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Link
            href={`/owner/bookings/${b.id}`}
            className="font-display font-semibold text-ink hover:text-turquoise-dark"
          >
            {b.propertyTitle}
          </Link>
          <p className="text-sm text-ink-secondary">
            {b.guestName ?? t.guest} · {date(locale, b.checkIn)} → {date(locale, b.checkOut)} ·{" "}
            {c.nights(b.nights)} · {c.guests(b.guestsCount)}
          </p>
          <p className="text-sm">
            <span className="font-mono text-xs text-ink-secondary">{b.reference}</span> ·{" "}
            <span className="font-medium">{money(locale, b.basePrice)}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-xs">
          <BookingStatusBadge status={b.status} />
          {b.status === "pending" && b.expiresAt && (
            <ExpiryCountdown expiresAt={b.expiresAt} prefix={t.replyWithin} />
          )}
        </div>
      </div>
      {b.guestNote && (
        <p className="rounded-lg bg-surface-soft px-md py-sm text-sm text-ink-secondary">
          <span className="font-medium text-ink">{t.note}:</span> {b.guestNote}
        </p>
      )}
      {children}
    </div>
  );

  return (
    <div className="flex flex-col gap-2xl">
      <section className="flex flex-col gap-md">
        <div className="flex flex-col gap-xs">
          <h1 className="font-display text-2xl font-bold">
            {t.pendingTitle}{" "}
            {pending.length > 0 && <span className="text-red-600">({pending.length})</span>}
          </h1>
          <p className="text-sm text-ink-secondary">{t.pendingHint}</p>
        </div>
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-lg text-center text-sm text-ink-secondary">
            {t.pendingEmpty}
          </p>
        ) : (
          pending.map((b) => (
            <Row key={b.id} b={b}>
              <OwnerRespondButtons bookingId={b.id} />
            </Row>
          ))
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.upcomingTitle}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.upcomingEmpty}</p>
        ) : (
          upcoming.map((b) => (
            <Row key={b.id} b={b}>
              <div className="flex flex-wrap items-center justify-between gap-sm text-sm">
                <div className="flex flex-wrap gap-xs">
                  <span
                    className={`rounded-full px-sm py-0.5 text-xs font-medium ${b.idsUploaded >= b.adultsCount ? "bg-turquoise-light text-turquoise-dark" : "bg-butter-soft text-ink"}`}
                  >
                    🪪 {t.ids(b.idsUploaded, b.adultsCount)}
                  </span>
                  {b.checklistDone && (
                    <span className="rounded-full bg-turquoise-light px-sm py-0.5 text-xs font-medium text-turquoise-dark">
                      {t.checklistDone}
                    </span>
                  )}
                </div>
                <Link href={`/owner/bookings/${b.id}`} className="font-medium text-turquoise-dark">
                  {t.open} →
                </Link>
              </div>
            </Row>
          ))
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.pastTitle}</h2>
        {past.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.pastEmpty}</p>
        ) : (
          past.map((b) => (
            <Row key={b.id} b={b}>
              {b.status === "confirmed" && b.checkOut < today && !reviewed.has(b.id) && (
                <GuestReviewForm bookingId={b.id} ownerId={user.id} guestId={b.guestId} />
              )}
            </Row>
          ))
        )}
      </section>
    </div>
  );
}
