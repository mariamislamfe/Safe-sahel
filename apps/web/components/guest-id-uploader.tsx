"use client";

import { nowMs } from "@/lib/time";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { checkFile, uploadPrivate } from "@/lib/upload";
import { ConsentCheckbox, CONSENT_VERSION } from "@/components/consent-checkbox";
import { useLocale } from "@/lib/i18n/locale-provider";
import { guestDict } from "@/lib/i18n/guest";
import { common, errorText } from "@/lib/i18n/common";
import { date } from "@/lib/i18n/format";
import type { GuestIdRecord } from "@/lib/queries/bookings";

/** Guest uploads one National ID per adult, after confirmation, with explicit consent. */
export function GuestIdUploader({
  bookingId,
  guestId,
  adultsCount,
  records,
}: {
  bookingId: string;
  guestId: string;
  adultsCount: number;
  records: GuestIdRecord[];
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = guestDict[locale].detail;
  const c = common[locale];
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = nowMs();
  const active = records.filter((r) => !r.purgedAt && new Date(r.purgeAfter).getTime() > now);
  const remaining = Math.max(0, adultsCount - active.length);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError(c.consentRequired);
    if (!file || !name.trim()) return setError(c.errors.guest_name_required!);
    const check = checkFile(file);
    if (check !== "ok")
      return setError(check === "too_large" ? c.fileTooLarge : c.fileTypeNotAllowed);

    setBusy(true);
    const { path, error: uploadError } = await uploadPrivate(
      "guest-ids",
      [guestId, bookingId],
      file,
    );
    if (uploadError) {
      setBusy(false);
      return setError(errorText(locale, rpcErrorCode(uploadError.message)));
    }
    const { error: rpcError } = await createClient().rpc("register_guest_id", {
      p_booking_id: bookingId,
      p_storage_path: path,
      p_guest_full_name: name.trim(),
      p_consent_version: CONSENT_VERSION,
    });
    setBusy(false);
    if (rpcError) return setError(errorText(locale, rpcErrorCode(rpcError.message)));
    setName("");
    setFile(null);
    router.refresh();
  }

  async function withdraw(id: string) {
    const { error: rpcError } = await createClient().rpc("withdraw_guest_id", { p_id: id });
    if (rpcError) setError(errorText(locale, rpcErrorCode(rpcError.message)));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-md">
      <p className="text-sm text-ink-secondary">{t.idsBody(adultsCount)}</p>
      <p className="text-sm font-medium text-ink">
        {remaining === 0 ? t.idsDone : t.idsCount(active.length, adultsCount)}
      </p>

      {records.length > 0 && (
        <ul className="flex flex-col gap-xs">
          {records.map((r) => {
            const scheduled = !r.purgedAt && new Date(r.purgeAfter).getTime() <= now;
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-sm rounded-md border border-border px-md py-sm text-sm"
              >
                <span className="truncate">🪪 {r.guestFullName}</span>
                <span className="shrink-0 text-xs text-ink-secondary">
                  {r.purgedAt ? (
                    t.purged
                  ) : scheduled ? (
                    t.removed
                  ) : (
                    <button
                      type="button"
                      onClick={() => withdraw(r.id)}
                      className="text-red-600 hover:underline"
                    >
                      {t.remove}
                    </button>
                  )}
                  {!r.purgedAt && !scheduled && (
                    <span className="ms-sm">· {date(locale, r.purgeAfter)}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {remaining > 0 && (
        <form
          onSubmit={upload}
          className="flex flex-col gap-sm rounded-lg border border-dashed border-border p-md"
        >
          <label className="flex flex-col gap-xs">
            <span className="text-sm font-medium">{t.guestName}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
            />
          </label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            capture="environment"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="text-sm text-ink-secondary"
          />
          <ConsentCheckbox checked={consent} onChange={setConsent} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
          >
            {busy ? t.uploading : t.uploadId}
          </button>
        </form>
      )}
    </div>
  );
}
