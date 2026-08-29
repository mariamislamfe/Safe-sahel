"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import type { DateRange } from "@/lib/queries/availability";
import { DateRangeCalendar } from "@/components/date-range-calendar";

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

function rangesOverlap(checkIn: string, checkOut: string, blocked: DateRange[]) {
  return blocked.some((r) => checkIn < r.end && checkOut > r.start);
}

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
  const { profile, loading } = useCurrentProfile();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nights = checkIn && checkOut ? daysBetween(checkIn, checkOut) : 0;
  const basePrice = nights > 0 ? nights * pricePerNight : 0;
  // Deposit is a flat half of one night's price, not a percentage of the
  // whole stay — matches the actual North Coast convention this models.
  const depositAmount = nights > 0 ? Math.round(pricePerNight / 2) : 0;
  const totalAmount = basePrice + depositAmount;

  const validationError = useMemo(() => {
    if (!checkIn || !checkOut) return null;
    if (nights <= 0) return "Check-out must be after check-in.";
    if (nights < minStayNights) return `Minimum stay is ${minStayNights} night(s).`;
    if (guests > maxGuests) return `This property sleeps up to ${maxGuests} guests.`;
    if (rangesOverlap(checkIn, checkOut, unavailableRanges)) return "Those dates aren't available.";
    return null;
  }, [checkIn, checkOut, nights, guests, minStayNights, maxGuests, unavailableRanges]);

  async function submit() {
    if (!profile) {
      router.push(`/login?redirect=/properties`);
      return;
    }
    if (validationError || nights <= 0) return;

    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    // Books instantly — no owner approval step. The exclusion constraint on
    // availability_blocks (below) already guarantees two guests can never
    // hold the same dates, so there's nothing left for a manual "confirm"
    // to gate.
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        property_id: propertyId,
        guest_id: profile.id,
        check_in: checkIn,
        check_out: checkOut,
        guests_count: guests,
        nights,
        base_price: basePrice,
        deposit_amount: depositAmount,
        total_amount: totalAmount,
        status: "confirmed",
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      setError(bookingError?.message ?? "Could not create booking.");
      setSubmitting(false);
      return;
    }

    const { error: blockError } = await supabase.from("availability_blocks").insert({
      property_id: propertyId,
      range: `[${checkIn},${checkOut})`,
      reason: "booked",
      booking_id: booking.id,
    });

    if (blockError) {
      // Someone else booked these dates in the meantime — the exclusion
      // constraint caught it. Undo the booking row and let the guest retry.
      await supabase.from("bookings").delete().eq("id", booking.id);
      setError("Those dates were just booked by someone else — try different dates.");
      setSubmitting(false);
      return;
    }

    router.push(`/booking/${booking.id}/confirmation`);
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">
          {!checkIn
            ? "Select check-in date"
            : !checkOut
              ? "Now select check-out date"
              : "Your stay"}
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

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">Guests</span>
        <input
          type="number"
          min={1}
          max={maxGuests}
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-24 rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>

      {nights > 0 && (
        <div className="flex flex-col gap-xs rounded-md bg-surface-soft p-md text-sm">
          <div className="flex justify-between">
            <span className="text-ink-secondary">
              {formatEgp(pricePerNight)} × {nights} night{nights > 1 ? "s" : ""}
            </span>
            <span>{formatEgp(basePrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-secondary">Security deposit (half a night)</span>
            <span>{formatEgp(depositAmount)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-xs font-medium text-ink">
            <span>Total</span>
            <span>{formatEgp(totalAmount)}</span>
          </div>
        </div>
      )}

      {(validationError || error) && (
        <p className="text-sm text-red-600">{validationError ?? error}</p>
      )}

      <button
        onClick={submit}
        disabled={submitting || loading || !checkIn || !checkOut || !!validationError}
        className="rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {submitting ? "Booking…" : profile ? "Book now" : "Log in to book"}
      </button>
      <p className="text-xs text-ink-secondary">
        Your dates are booked the moment you confirm — no waiting on the host. Message them to
        arrange the security deposit and check-in; the rest is paid directly to the host at
        check-in. Online payment collection is coming soon. You can cancel any time up to 3 days
        before check-in for a full refund — cancelling closer to your stay forfeits the deposit.
      </p>
    </div>
  );
}
