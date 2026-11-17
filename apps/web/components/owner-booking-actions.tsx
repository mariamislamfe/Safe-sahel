"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { errorText } from "@/lib/i18n/common";
import { useFeedback } from "@/components/feedback";
import { dashboardDict } from "@/lib/i18n/dashboard";

/** Confirm / decline a pending request via respond_to_booking(). */
export function OwnerRespondButtons({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].bookings;
  const f = dashboardDict[locale].toasts;
  const fb = useFeedback();
  const [busy, setBusy] = useState<"confirm" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(decision: "confirm" | "decline") {
    let note: string | null = null;
    if (
      decision === "confirm" &&
      !(await fb.confirm({
        title: f.confirmTitle,
        body: t.confirmPrompt,
        confirmLabel: f.confirmCta,
      }))
    )
      return;
    if (decision === "decline") {
      const answer = await fb.prompt({
        title: f.declineTitle,
        tone: "danger",
        confirmLabel: f.declineConfirm,
        input: { label: t.declineReason, multiline: true },
      });
      if (answer === null) return;
      note = answer.trim() || null;
    }
    setBusy(decision);
    setError(null);
    const { data, error: e } = await createClient().rpc("respond_to_booking", {
      p_booking_id: bookingId,
      p_decision: decision,
      p_note: note,
    });
    setBusy(null);
    if (e) return setError(errorText(locale, rpcErrorCode(e.message)));
    if (data === "expired") setError(errorText(locale, "booking_expired"));
    else fb.toast(decision === "confirm" ? f.bookingConfirmed : f.bookingDeclined);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-stretch gap-xs sm:items-end">
      <div className="flex gap-sm">
        <button
          onClick={() => respond("decline")}
          disabled={busy !== null}
          className="flex-1 rounded-xl border border-border px-lg py-2.5 text-sm font-medium text-ink-secondary hover:border-red-300 hover:text-red-600 disabled:opacity-60 sm:flex-none"
        >
          {t.decline}
        </button>
        <button
          onClick={() => respond("confirm")}
          disabled={busy !== null}
          className="flex-1 rounded-xl bg-turquoise px-lg py-2.5 text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60 sm:flex-none"
        >
          {busy === "confirm" ? t.confirming : t.confirm}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

/** Owner cancelling a CONFIRMED booking → strike (cancel_booking() records it). */
export function OwnerCancelBooking({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].bookingDetail;
  const f = dashboardDict[locale].toasts;
  const fb = useFeedback();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (
      !(await fb.confirm({
        title: f.cancelTitle,
        body: t.cancelConfirm,
        tone: "danger",
        confirmLabel: f.cancelCta,
        cancelLabel: f.keep,
      }))
    )
      return;
    setBusy(true);
    const { error: e } = await createClient().rpc("cancel_booking", {
      p_booking_id: bookingId,
      p_reason: reason || null,
    });
    setBusy(false);
    if (e) return setError(errorText(locale, rpcErrorCode(e.message)));
    fb.toast(f.bookingCancelled);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-sm">
      <p className="rounded-lg bg-red-50 px-md py-sm text-sm text-red-800">⚠️ {t.cancelWarning}</p>
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.cancelReason}</span>
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={cancel}
        disabled={busy}
        className="w-fit rounded-md border border-red-300 px-lg py-sm text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {t.cancelButton}
      </button>
    </div>
  );
}
