"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function CancelBookingButton({
  bookingId,
  checkIn,
  depositAmount,
}: {
  bookingId: string;
  checkIn: string;
  depositAmount: number;
}) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLate = daysUntil(checkIn) < 3;

  async function cancel() {
    const message = isLate
      ? `This is within 3 days of check-in, so your ${formatEgp(depositAmount)} deposit won't be refunded. Cancel anyway?`
      : "Cancel this booking? You'll get a full refund since it's 3+ days before check-in.";
    if (!confirm(message)) return;

    setCancelling(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancellation_fee_amount: isLate ? depositAmount : 0,
      })
      .eq("id", bookingId);

    if (updateError) {
      setError(updateError.message);
      setCancelling(false);
      return;
    }

    // Release the date hold so those nights become bookable again.
    await supabase.from("availability_blocks").delete().eq("booking_id", bookingId);

    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-xs">
      <button
        onClick={cancel}
        disabled={cancelling}
        className="text-sm font-medium text-ink-secondary hover:text-red-600 disabled:opacity-60"
      >
        {cancelling ? "Cancelling…" : "Cancel booking"}
      </button>
      {isLate && !cancelling && (
        <p className="text-[11px] text-red-600">Within 3 days — deposit is forfeited</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
