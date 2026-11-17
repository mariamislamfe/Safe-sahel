"use client";

import { useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import type { DateRange } from "@/lib/queries/availability";
import { DateRangeCalendar } from "@/components/date-range-calendar";
import { useLocale } from "@/lib/i18n/locale-provider";
import { guestDict } from "@/lib/i18n/guest";
import { common, errorText } from "@/lib/i18n/common";
import { money } from "@/lib/i18n/format";

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function rangesOverlap(checkIn: string, checkOut: string, blocked: DateRange[]) {
  return blocked.some((r) => checkIn < r.end && checkOut > r.start);
}

/**
 * Sends a booking REQUEST (status pending). Dates are only blocked when the
 * owner confirms — request_booking() computes the price server-side.
 */
export function BookingForm({
  propertyId,
  pricePerNight,
  minStayNights,
  maxGuests,
  unavailableRanges,
}: {
  propertyId: string;
  pricePerNight: number;
  minStayNights: number;
  maxGuests: number;
  unavailableRanges: DateRange[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale();
  const t = guestDict[locale].form;
  const c = common[locale];
  const { profile, loading } = useCurrentProfile();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [adults, setAdults] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  const basePrice = nights > 0 ? nights * pricePerNight : 0;
  // Deposit convention: half of one night (matches request_booking()).
  const depositAmount = nights > 0 ? Math.round(pricePerNight / 2) : 0;

  const validationError = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    if (nights <= 0) return c.errors.invalid_dates!;
    if (nights < minStayNights) return t.minStay(minStayNights);
    if (guests > maxGuests) return t.maxGuests(maxGuests);
    if (adults < 1 || adults > guests) return c.errors.invalid_adults!;
    if (rangesOverlap(checkIn, checkOut, unavailableRanges)) return t.unavailable;
    return null;
  }, [
    checkIn,
    checkOut,
    nights,
    guests,
    adults,
    minStayNights,
    maxGuests,
    unavailableRanges,
    t,
    c,
  ]);

  async function submit() {
    if (!profile) {
      router.push(`/login?redirect=${encodeURIComponent(pathname ?? "/")}`);
      return;
    }
    if (validationError || nights <= 0) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("request_booking", {
      p_property_id: propertyId,
      p_check_in: checkIn,
      p_check_out: checkOut,
      p_guests: guests,
      p_adults: adults,
      p_note: note || null,
    });

    if (rpcError || !data?.[0]) {
      setError(errorText(locale, rpcErrorCode(rpcError?.message)));
      setSubmitting(false);
      return;
    }
    router.push(`/booking/${data[0].booking_id}/confirmation`);
  }

  const inputClass =
    "w-full rounded-xl border border-border bg-surface px-md py-2.5 text-sm outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20";

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">
          {!checkIn ? t.selectCheckIn : !checkOut ? t.selectCheckOut : t.yourStay}
        </span>
        <DateRangeCalendar
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(nextIn, nextOut) => {
            setCheckIn(nextIn);
            setCheckOut(nextOut);
          }}
          unavailableRanges={unavailableRanges}
        />
      </div>

      <div className="grid grid-cols-2 gap-sm">
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.guests}</span>
          <input
            type="number"
            min={1}
            max={maxGuests}
            value={guests}
            onChange={(e) => {
              const n = Number(e.target.value);
              setGuests(n);
              if (adults > n) setAdults(Math.max(1, n));
            }}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.adults}</span>
          <input
            type="number"
            min={1}
            max={guests}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value))}
            className={inputClass}
          />
        </label>
      </div>
      <p className="-mt-xs text-xs text-ink-secondary">{t.adultsHint}</p>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">{t.note}</span>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder={t.notePlaceholder}
          className={inputClass}
        />
      </label>

      {nights > 0 && (
        <div className="flex flex-col gap-xs rounded-md bg-surface-soft p-md text-sm">
          <div className="flex justify-between gap-md">
            <span className="text-ink-secondary">
              {t.priceLine(money(locale, pricePerNight), c.nights(nights))}
            </span>
            <span>{money(locale, basePrice)}</span>
          </div>
          <div className="flex justify-between gap-md">
            <span className="text-ink-secondary">{t.deposit}</span>
            <span>{money(locale, depositAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-xs font-medium text-ink">
            <span>{t.total}</span>
            <span>{money(locale, basePrice + depositAmount)}</span>
          </div>
        </div>
      )}

      {(validationError || error) && (
        <p className="text-sm text-red-600">{validationError ?? error}</p>
      )}

      <button
        onClick={submit}
        disabled={
          submitting || loading || (!!profile && (!checkIn || !checkOut || !!validationError))
        }
        className="rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {submitting ? t.sending : profile ? t.send : t.login}
      </button>
      <p className="text-xs leading-relaxed text-ink-secondary">{t.explainer}</p>
    </div>
  );
}
