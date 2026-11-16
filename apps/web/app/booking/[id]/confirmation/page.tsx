import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { guestDict } from "@/lib/i18n/guest";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { getBookingDetail } from "@/lib/queries/bookings";
import { ExpiryCountdown } from "@/components/booking-bits";

/** Shown right after a request is sent — never says "booked". */
export default async function BookingRequestSentPage(
  props: PageProps<"/booking/[id]/confirmation">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const booking = await getBookingDetail(id);
  if (!booking || booking.guestId !== user.id) notFound();
  if (booking.status !== "pending") redirect(`/account/bookings/${id}`);

  const locale = await getLocale();
  const t = guestDict[locale].sent;
  const c = common[locale];

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-lg px-lg py-3xl text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-butter-soft text-2xl">
        ⏳
      </div>
      <div className="flex flex-col gap-sm">
        <h1 className="text-balance font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-ink-secondary">{t.body}</p>
        {booking.expiresAt && (
          <div>
            <ExpiryCountdown expiresAt={booking.expiresAt} />
          </div>
        )}
      </div>

      <div className="w-full rounded-2xl border border-border p-lg text-start text-sm">
        <p className="font-display font-semibold text-ink">{booking.propertyTitle}</p>
        <p className="text-ink-secondary">
          {date(locale, booking.checkIn)} → {date(locale, booking.checkOut)} ·{" "}
          {c.nights(booking.nights)} · {c.guests(booking.guestsCount)}
        </p>
        <p className="mt-xs text-ink-secondary">
          {c.bookingRef}:{" "}
          <span className="font-mono font-semibold text-ink">{booking.reference}</span> ·{" "}
          {money(locale, booking.totalAmount)}
        </p>
      </div>

      <ol className="flex w-full flex-col gap-md rounded-2xl border border-border p-lg text-start">
        {t.steps.map((step, i) => (
          <li key={step.title} className="flex gap-md">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-turquoise-light text-xs font-bold text-turquoise-dark">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-ink">{step.title}</p>
              <p className="text-xs text-ink-secondary">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap justify-center gap-md">
        <Link href={`/account/bookings/${booking.id}`} className="font-medium text-turquoise-dark">
          {t.viewBooking}
        </Link>
        {booking.propertySlug && (
          <Link
            href={`/properties/${booking.propertySlug}`}
            className="font-medium text-ink-secondary"
          >
            {t.backToListing}
          </Link>
        )}
      </div>
    </main>
  );
}
