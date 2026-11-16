import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { guestDict } from "@/lib/i18n/guest";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { expireStaleBookings } from "@/lib/queries/bookings";
import { ReviewForm } from "@/components/review-form";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";

export default async function GuestBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/bookings");

  await expireStaleBookings();
  const locale = await getLocale();
  const t = guestDict[locale].list;
  const c = common[locale];

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, reference, property_id, check_in, check_out, nights, guests_count, total_amount, deposit_amount, status, expires_at",
    )
    .eq("guest_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const ids = (bookings ?? []).map((b) => b.id);
  const [{ data: props }, { data: reviewed }] = await Promise.all([
    ids.length
      ? supabase
          .from("properties")
          .select("id, title, slug")
          .in("id", [...new Set((bookings ?? []).map((b) => b.property_id))])
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
    ids.length
      ? supabase.from("reviews").select("booking_id").in("booking_id", ids)
      : Promise.resolve({ data: [] as { booking_id: string }[] }),
  ]);
  const propertyById = new Map((props ?? []).map((p) => [p.id, p]));
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.booking_id));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-lg px-lg py-2xl">
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>

      {!bookings || bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border p-4xl text-center">
          <p className="font-medium text-ink">{t.empty}</p>
          <Link href="/search" className="text-sm font-medium text-turquoise-dark">
            {t.browse}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {bookings.map((b) => {
            const property = propertyById.get(b.property_id);
            const canReview =
              b.status === "confirmed" && b.check_out < today && !reviewedIds.has(b.id);
            const cancellable =
              (b.status === "pending" || b.status === "confirmed") && b.check_in > today;
            return (
              <div key={b.id} className="flex flex-col gap-sm rounded-xl border border-border p-md">
                <div className="flex flex-wrap items-start justify-between gap-md">
                  <div className="flex min-w-0 flex-col gap-xs">
                    <Link
                      href={`/account/bookings/${b.id}`}
                      className="font-display font-semibold text-ink hover:text-turquoise-dark"
                    >
                      {property?.title ?? "—"}
                    </Link>
                    <p className="text-sm text-ink-secondary">
                      {date(locale, b.check_in)} → {date(locale, b.check_out)} ·{" "}
                      {c.guests(b.guests_count)}
                    </p>
                    <p className="text-sm text-ink">
                      <span className="font-mono text-xs text-ink-secondary">{b.reference}</span> ·{" "}
                      <span className="font-medium">{money(locale, Number(b.total_amount))}</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-xs">
                    <BookingStatusBadge status={b.status} />
                    {b.status === "pending" && b.expires_at && (
                      <ExpiryCountdown expiresAt={b.expires_at} />
                    )}
                  </div>
                </div>
                {b.status === "pending" && (
                  <p className="text-sm text-ink-secondary">{t.pendingNote}</p>
                )}
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <Link
                    href={`/account/bookings/${b.id}`}
                    className="rounded-md bg-surface-soft px-md py-xs text-sm font-medium text-turquoise-dark hover:bg-turquoise-light"
                  >
                    {t.open} →
                  </Link>
                  {cancellable && (
                    <CancelBookingButton
                      bookingId={b.id}
                      checkIn={b.check_in}
                      depositAmount={Number(b.deposit_amount)}
                      status={b.status}
                    />
                  )}
                </div>
                {canReview && (
                  <ReviewForm bookingId={b.id} propertyId={b.property_id} guestId={user.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
