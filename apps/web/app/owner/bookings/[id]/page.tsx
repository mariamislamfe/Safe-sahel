import { nowMs } from "@/lib/time";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import {
  getBookingContact,
  getBookingDetail,
  getChecklist,
  getGuestIds,
} from "@/lib/queries/bookings";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { DocumentViewButton } from "@/components/document-view-button";
import { CheckinChecklist } from "@/components/checkin-checklist";
import { OwnerCancelBooking, OwnerRespondButtons } from "@/components/owner-booking-actions";
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

export default async function OwnerBookingDetailPage(props: PageProps<"/owner/bookings/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  await supabase.rpc("expire_stale_bookings");
  const booking = await getBookingDetail(id);
  if (!booking || booking.ownerId !== user.id) notFound();

  const locale = await getLocale();
  const t = ownerDict[locale].bookingDetail;
  const tb = ownerDict[locale].bookings;
  const c = common[locale];
  const confirmed = booking.status === "confirmed";
  const today = new Date().toISOString().slice(0, 10);

  const [contact, guestIds, checklist] = await Promise.all([
    getBookingContact(id),
    confirmed ? getGuestIds(id) : Promise.resolve([]),
    confirmed ? getChecklist(id) : Promise.resolve(null),
  ]);
  const now = nowMs();
  const visibleIds = guestIds.filter((g) => !g.purgedAt && new Date(g.purgeAfter).getTime() > now);

  return (
    <div className="flex max-w-3xl flex-col gap-lg">
      <Link
        href="/owner/bookings"
        className="flex w-fit items-center gap-xs text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <Icon name="arrow" className="size-4 -scale-x-100 rtl:scale-x-100" />
        {t.back}
      </Link>

      <Card className="flex flex-col gap-sm">
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <BookingStatusBadge status={booking.status} />
          {booking.status === "pending" && booking.expiresAt && (
            <ExpiryCountdown expiresAt={booking.expiresAt} prefix={tb.replyWithin} />
          )}
        </div>
        <h1 className="font-display text-xl font-bold">{booking.propertyTitle}</h1>
        <p className="text-sm text-ink-secondary">
          {date(locale, booking.checkIn)} → {date(locale, booking.checkOut)} ·{" "}
          {c.nights(booking.nights)} · {c.guests(booking.guestsCount)} ·{" "}
          {c.adults(booking.adultsCount)}
        </p>
        <p className="text-sm">
          {c.bookingRef}: <span className="font-mono font-semibold">{booking.reference}</span> ·{" "}
          {tb.value}: <span className="font-medium">{money(locale, booking.basePrice)}</span>
        </p>
        {booking.guestNote && (
          <p className="rounded-lg bg-surface-soft px-md py-sm text-sm text-ink-secondary">
            <span className="font-medium text-ink">{tb.note}:</span> {booking.guestNote}
          </p>
        )}
        {booking.status === "pending" && <OwnerRespondButtons bookingId={booking.id} />}
      </Card>

      {confirmed && (
        <>
          <Section title={t.guestTitle}>
            <p className="font-medium">{contact?.guest_name ?? "—"}</p>
            {contact?.guest_phone && (
              <WhatsAppButton
                phone={contact.guest_phone}
                label={t.whatsapp}
                message={`Safe Sahel · ${booking.reference}`}
              />
            )}
          </Section>

          <Section title={t.idsTitle}>
            <p className="text-sm text-ink-secondary">{t.idsBody}</p>
            <p className="text-sm font-medium">{t.idsExpected(booking.adultsCount)}</p>
            {visibleIds.length === 0 ? (
              <p className="text-sm text-ink-secondary">{t.noIds}</p>
            ) : (
              <ul className="flex flex-col gap-xs">
                {visibleIds.map((g) => (
                  <li
                    key={g.id}
                    className="flex flex-wrap items-center justify-between gap-sm rounded-lg border border-border px-md py-sm"
                  >
                    <span className="text-sm">🪪 {g.guestFullName}</span>
                    <DocumentViewButton kind="guest_id" id={g.id} />
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title={t.checklistTitle}>
            <CheckinChecklist bookingId={booking.id} party="owner" initial={checklist} />
            <Link
              href={`/owner/bookings/${booking.id}/handover`}
              className="text-sm font-medium text-turquoise-dark"
            >
              📸 {t.handover} →
            </Link>
          </Section>

          {booking.checkIn > today && (
            <Section title={t.cancelTitle}>
              <OwnerCancelBooking bookingId={booking.id} />
            </Section>
          )}
        </>
      )}
    </div>
  );
}
