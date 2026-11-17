import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { guestDict } from "@/lib/i18n/guest";
import { common } from "@/lib/i18n/common";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { date, money } from "@/lib/i18n/format";
import { expireStaleBookings } from "@/lib/queries/bookings";
import { ReviewForm } from "@/components/review-form";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";
import { EmptyState, PageHeader, Section, Thumb } from "@/components/admin/ui";
import { getCoverImages } from "@/lib/queries/images";
import { Icon } from "@/components/admin/icons";

type Row = {
  id: string;
  reference: string;
  property_id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guests_count: number;
  total_amount: number | string;
  deposit_amount: number | string;
  status: string;
  expires_at: string | null;
};

export default async function GuestBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/bookings");

  await expireStaleBookings();
  const locale = await getLocale();
  const t = guestDict[locale].list;
  const a = dashboardDict[locale].account;
  const c = common[locale];

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, reference, property_id, check_in, check_out, nights, guests_count, total_amount, deposit_amount, status, expires_at",
    )
    .eq("guest_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const all = (bookings ?? []) as Row[];
  const ids = all.map((b) => b.id);
  const [{ data: props }, { data: reviewed }, covers] = await Promise.all([
    ids.length
      ? supabase
          .from("properties")
          .select("id, title, slug")
          .in("id", [...new Set(all.map((b) => b.property_id))])
      : Promise.resolve({ data: [] as { id: string; title: string; slug: string }[] }),
    ids.length
      ? supabase.from("reviews").select("booking_id").in("booking_id", ids)
      : Promise.resolve({ data: [] as { booking_id: string }[] }),
    getCoverImages(all.map((b) => b.property_id)),
  ]);
  const propertyById = new Map((props ?? []).map((p) => [p.id, p]));
  const reviewedIds = new Set((reviewed ?? []).map((r) => r.booking_id));
  const today = new Date().toISOString().slice(0, 10);

  const waiting = all.filter((b) => b.status === "pending");
  const upcoming = all
    .filter((b) => b.status === "confirmed" && b.check_out >= today)
    .sort((x, y) => x.check_in.localeCompare(y.check_in));
  const past = all.filter((b) => !waiting.includes(b) && !upcoming.includes(b));
  const next = upcoming[0];
  const daysUntil = next
    ? Math.round((new Date(next.check_in).getTime() - new Date(today).getTime()) / 86_400_000)
    : 0;

  const card = (b: Row) => {
    const property = propertyById.get(b.property_id);
    const canReview = b.status === "confirmed" && b.check_out < today && !reviewedIds.has(b.id);
    const cancellable = (b.status === "pending" || b.status === "confirmed") && b.check_in > today;
    return (
      <article
        key={b.id}
        className="flex flex-col gap-md rounded-2xl border border-border bg-surface p-lg shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-sm">
          <div className="flex min-w-0 items-center gap-md">
            <Thumb src={covers.get(b.property_id)} alt={property?.title} />
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={`/account/bookings/${b.id}`}
                className="truncate font-display font-semibold hover:text-turquoise-dark"
              >
                {property?.title ?? "—"}
              </Link>
              <p className="text-sm text-ink-secondary">
                {date(locale, b.check_in)} → {date(locale, b.check_out)} ·{" "}
                {c.guests(b.guests_count)}
              </p>
            </div>
          </div>
          {b.status === "pending" && b.expires_at ? (
            <ExpiryCountdown expiresAt={b.expires_at} />
          ) : (
            <BookingStatusBadge status={b.status} />
          )}
        </div>

        {b.status === "pending" && (
          <p className="rounded-xl bg-amber-50/70 px-md py-sm text-sm text-amber-900">
            {t.pendingNote}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-sm border-t border-border pt-sm text-sm">
          <span className="text-ink-secondary">
            <span className="font-mono text-xs">{b.reference}</span> ·{" "}
            <span className="font-semibold text-ink">{money(locale, Number(b.total_amount))}</span>
          </span>
          <div className="flex items-center gap-sm">
            {cancellable && (
              <CancelBookingButton
                bookingId={b.id}
                checkIn={b.check_in}
                depositAmount={Number(b.deposit_amount)}
                status={b.status}
              />
            )}
            <Link
              href={`/account/bookings/${b.id}`}
              className="flex items-center gap-xs rounded-lg bg-surface-soft px-md py-1.5 font-semibold text-turquoise-dark hover:bg-turquoise-light"
            >
              {t.open}
              <Icon name="arrow" className="size-4 rtl:-scale-x-100" />
            </Link>
          </div>
        </div>

        {canReview && <ReviewForm bookingId={b.id} propertyId={b.property_id} guestId={user.id} />}
      </article>
    );
  };

  return (
    <>
      <PageHeader title={t.title} count={all.length || undefined} />

      {all.length === 0 ? (
        <div className="flex flex-col items-center gap-md">
          <EmptyState icon="calendar" title={t.empty} body={a.emptyBody} />
          <Link
            href="/search"
            className="rounded-xl bg-turquoise px-xl py-sm text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            {t.browse}
          </Link>
        </div>
      ) : (
        <>
          {next && (
            <Link
              href={`/account/bookings/${next.id}`}
              className="group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-turquoise to-turquoise-dark p-lg text-white shadow-md sm:p-xl"
            >
              {covers.get(next.property_id) ? (
                <>
                  <Image
                    src={covers.get(next.property_id)!}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 960px, 100vw"
                    className="-z-10 object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div
                    aria-hidden
                    className="absolute inset-0 -z-10 bg-gradient-to-t from-ink/85 via-ink/40 to-ink/10"
                  />
                </>
              ) : (
                <div
                  aria-hidden
                  className="absolute -end-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl"
                />
              )}
              <div className="relative flex min-h-40 flex-wrap items-end justify-between gap-md">
                <div className="flex flex-col gap-xs">
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-butter">
                    {a.nextTrip}
                  </span>
                  <span className="font-display text-2xl font-bold">
                    {propertyById.get(next.property_id)?.title ?? "—"}
                  </span>
                  <span className="text-sm text-white/85">
                    {date(locale, next.check_in)} → {date(locale, next.check_out)} ·{" "}
                    {c.nights(next.nights)}
                  </span>
                </div>
                <span className="flex items-center gap-xs rounded-full bg-white/15 px-md py-1.5 text-sm font-semibold backdrop-blur">
                  {a.inDays(daysUntil)}
                  <Icon name="arrow" className="size-4 rtl:-scale-x-100" />
                </span>
              </div>
            </Link>
          )}

          {waiting.length > 0 && (
            <Section title={a.waiting} count={waiting.length}>
              <div className="flex flex-col gap-sm">{waiting.map(card)}</div>
            </Section>
          )}
          {upcoming.length > 0 && (
            <Section title={a.upcoming} count={upcoming.length}>
              <div className="flex flex-col gap-sm">{upcoming.map(card)}</div>
            </Section>
          )}
          {past.length > 0 && (
            <Section title={a.past} count={past.length}>
              <div className="flex flex-col gap-sm">{past.map(card)}</div>
            </Section>
          )}
        </>
      )}
    </>
  );
}
