"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { guestDict } from "@/lib/i18n/guest";
import { errorText } from "@/lib/i18n/common";
import { money } from "@/lib/i18n/format";
import { useFeedback } from "@/components/feedback";
import { dashboardDict } from "@/lib/i18n/dashboard";

function daysUntil(dateIso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateIso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** Guest-side cancel / withdraw — goes through cancel_booking() (no direct table writes). */
export function CancelBookingButton({
  bookingId,
  checkIn,
  depositAmount,
  status,
}: {
  bookingId: string;
  checkIn: string;
  depositAmount: number;
  status: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = guestDict[locale].cancel;
  const f = dashboardDict[locale].toasts;
  const fb = useFeedback();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLate = status === "confirmed" && daysUntil(checkIn) < 3;

  async function cancel() {
    const message =
      status === "pending"
        ? t.confirmPending
        : isLate
          ? t.confirmLate(money(locale, depositAmount))
          : t.confirmEarly;
    const ok = await fb.confirm({
      title: f.cancelTitle,
      body: message,
      tone: isLate ? "danger" : "default",
      confirmLabel: f.cancelCta,
      cancelLabel: f.keep,
    });
    if (!ok) return;

    setCancelling(true);
    setError(null);
    const { error: rpcError } = await createClient().rpc("cancel_booking", {
      p_booking_id: bookingId,
    });
    if (rpcError) {
      setError(errorText(locale, rpcErrorCode(rpcError.message)));
      setCancelling(false);
      return;
    }
    fb.toast(status === "pending" ? f.requestWithdrawn : f.bookingCancelled);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-xs">
      <button
        onClick={cancel}
        disabled={cancelling}
        className="text-sm font-medium text-ink-secondary hover:text-red-600 disabled:opacity-60"
      >
        {cancelling ? t.cancelling : t.button}
      </button>
      {isLate && !cancelling && <p className="text-[11px] text-red-600">{t.late}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
