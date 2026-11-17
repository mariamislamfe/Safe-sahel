import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { bookingWhatsAppMessage } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { guestDict } from "@/lib/i18n/guest";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import {
  expireStaleBookings,
  getBookingContact,
  getBookingDetail,
  getChecklist,
  getGuestIds,
} from "@/lib/queries/bookings";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { GuestIdUploader } from "@/components/guest-id-uploader";
import { CheckinChecklist } from "@/components/checkin-checklist";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { Card } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-md">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </Card>
  );
}

export default async function GuestBookingDetailPage(props: PageProps<"/account/bookings/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/account/bookings/${id}`);

  await expireStaleBookings();
  const booking = await getBookingDetail(id);
  if (!booking || booking.guestId !== user.id) notFound();

  const locale = await getLocale();
  const t = guestDict[locale].detail;
  const c = common[locale];
  const confirmed = booking.status === "confirmed";

  const [contact, guestIds, checklist] = await Promise.all([
    confirmed ? getBookingContact(id) : Promise.resolve(null),
    confirmed ? getGuestIds(id) : Promise.resolve([]),
    confirmed ? getChecklist(id) : Promise.resolve(null),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const cancellable = (booking.status === "pending" || confirmed) && booking.checkIn > today;

  const header =
    booking.status === "pending"
      ? { title: t.pendingTitle, body: t.pendingBody, tone: "border-amber-200 bg-amber-50" }
      : confirmed
        ? { title: t.confirmedTitle, body: null, tone: "border-turquoise/30 bg-turquoise-light" }
        : booking.status === "declined"
          ? {
              title: t.declinedTitle,
              body:
                booking.declineReason === "dates_taken"
                  ? t.declinedDatesTaken
                  : booking.declineReason,
              tone: "border-red-200 bg-red-50",
            }
          : booking.status === "expired"
            ? { title: t.expiredTitle, body: t.expiredBody, tone: "border-border bg-surface" }
            : {
                title: t.cancelledTitle,
                body: booking.cancelledBy === "owner" ? t.cancelledByOwner : null,
                tone: "border-border bg-surface",
              };

  return (
    <div className="flex max-w-3xl flex-col gap-lg">
      <Link
        href="/account/bookings"
        className="flex w-fit items-center gap-xs text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <Icon name="arrow" className="size-4 -scale-x-100 rtl:scale-x-100" />
        {c.back}
      </Link>

      <div className={`flex flex-col gap-sm rounded-2xl border p-lg ${header.tone}`}>
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <BookingStatusBadge status={booking.status} />
          {booking.status === "pending" && booking.expiresAt && (
            <ExpiryCountdown expiresAt={booking.expiresAt} />
          )}
        </div>
        <h1 className="text-balance font-display text-xl font-bold text-ink">{header.title}</h1>
        {header.body && <p className="text-sm text-ink-secondary">{header.body}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-md rounded-2xl border border-border bg-surface p-lg text-sm shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:grid-cols-4">
        <div className="col-span-2">
          <dt className="text-ink-secondary">{t.property}</dt>
          <dd className="font-medium">
            {booking.propertySlug ? (
              <Link
                href={`/properties/${booking.propertySlug}`}
                className="hover:text-turquoise-dark"
              >
                {booking.propertyTitle}
              </Link>
            ) : (
              booking.propertyTitle
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-secondary">{t.reference}</dt>
          <dd className="font-mono font-semibold">{booking.reference}</dd>
        </div>
        <div>
          <dt className="text-ink-secondary">{money(locale, booking.totalAmount)}</dt>
          <dd>{c.nights(booking.nights)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-ink-secondary">{t.dates}</dt>
          <dd>
            {date(locale, booking.checkIn)} → {date(locale, booking.checkOut)} ·{" "}
            {c.guests(booking.guestsCount)} · {c.adults(booking.adultsCount)}
          </dd>
        </div>
      </dl>

      {confirmed && contact && (
        <>
          <Section title={t.legalNameTitle}>
            {contact.owner_legal_name ? (
              <p className="rounded-lg bg-surface-soft px-md py-sm font-display text-xl font-bold tracking-tight text-ink">
                {contact.owner_legal_name}
              </p>
            ) : (
              <p className="text-sm text-red-700">{t.noLegalName}</p>
            )}
            <p className="rounded-lg border border-red-200 bg-red-50 px-md py-sm text-sm font-semibold text-red-800">
              ⚠️ {t.legalNameWarning}
            </p>
            {contact.owner_phone ? (
              <WhatsAppButton
                phone={contact.owner_phone}
                propertyId={booking.propertyId}
                label={t.whatsapp}
                message={bookingWhatsAppMessage({
                  reference: booking.reference,
                  propertyTitle: booking.propertyTitle,
                  checkIn: booking.checkIn,
                  checkOut: booking.checkOut,
                  guestName: contact.guest_name,
                })}
              />
            ) : (
              <p className="text-sm text-ink-secondary">{t.noPhone}</p>
            )}
          </Section>

          <Section title={t.idsTitle}>
            <GuestIdUploader
              bookingId={booking.id}
              guestId={user.id}
              adultsCount={booking.adultsCount}
              records={guestIds}
            />
          </Section>

          <Section title={t.depositTitle}>
            <p className="text-sm text-ink-secondary">
              {t.depositBody(money(locale, booking.depositAmount))}
            </p>
          </Section>

          <Section title={t.checklistTitle}>
            <CheckinChecklist bookingId={booking.id} party="guest" initial={checklist} />
          </Section>
        </>
      )}

      {cancellable && (
        <div className="flex justify-end">
          <CancelBookingButton
            bookingId={booking.id}
            checkIn={booking.checkIn}
            depositAmount={booking.depositAmount}
            status={booking.status}
          />
        </div>
      )}
    </div>
  );
}
