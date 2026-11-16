"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { guestDict } from "@/lib/i18n/guest";
import { common, errorText } from "@/lib/i18n/common";
import { dateTime } from "@/lib/i18n/format";
import type { Checklist, ChecklistItem } from "@/lib/queries/bookings";

export const CHECKLIST_KEYS = [
  "cleanliness",
  "ac",
  "water_electricity",
  "kitchen",
  "furniture",
  "bathrooms",
  "keys_access",
  "inventory",
  "existing_damage",
] as const;

function Stamp({
  label,
  at,
  waiting,
  locale,
}: {
  label: string;
  at: string | null | undefined;
  waiting: string;
  locale: "en" | "ar";
}) {
  return (
    <span
      className={`rounded-full px-sm py-0.5 text-xs font-medium ${at ? "bg-turquoise-light text-turquoise-dark" : "bg-surface-soft text-ink-secondary"}`}
    >
      {at ? `✓ ${label} · ${dateTime(locale, at)}` : `${label}: ${waiting}`}
    </span>
  );
}

/**
 * Check-in condition checklist. Owner and guest both fill it and both
 * confirm the same version; editing after a confirmation resets both
 * (enforced in save_checkin_checklist()).
 */
export function CheckinChecklist({
  bookingId,
  party,
  initial,
}: {
  bookingId: string;
  party: "owner" | "guest";
  initial: Checklist;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = guestDict[locale].checklist;
  const c = common[locale];

  const byKey = new Map((initial?.items ?? []).map((i) => [i.key, i]));
  const [items, setItems] = useState<ChecklistItem[]>(
    CHECKLIST_KEYS.map((key) => byKey.get(key) ?? { key, ok: null, note: "" }),
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [busy, setBusy] = useState<"save" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const locked = !!initial?.ownerConfirmedAt && !!initial?.guestConfirmedAt;
  const myConfirmation = party === "owner" ? initial?.ownerConfirmedAt : initial?.guestConfirmedAt;

  function update(key: string, patch: Partial<ChecklistItem>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  async function save() {
    setBusy("save");
    setError(null);
    const { error: e } = await createClient().rpc("save_checkin_checklist", {
      p_booking_id: bookingId,
      p_items: items,
      p_notes: notes || null,
    });
    setBusy(null);
    if (e) setError(errorText(locale, rpcErrorCode(e.message)));
    router.refresh();
  }

  async function confirmIt() {
    setBusy("confirm");
    setError(null);
    const supabase = createClient();
    // Save first so you confirm exactly what's on screen.
    const dirty =
      JSON.stringify(items) !== JSON.stringify(initial?.items ?? []) ||
      (notes || null) !== (initial?.notes ?? null);
    if (dirty || !initial) {
      const { error: e } = await supabase.rpc("save_checkin_checklist", {
        p_booking_id: bookingId,
        p_items: items,
        p_notes: notes || null,
      });
      if (e) {
        setBusy(null);
        return setError(errorText(locale, rpcErrorCode(e.message)));
      }
    }
    const { error: e } = await supabase.rpc("confirm_checkin_checklist", {
      p_booking_id: bookingId,
    });
    setBusy(null);
    if (e) setError(errorText(locale, rpcErrorCode(e.message)));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-md">
      <p className="text-sm text-ink-secondary">{t.intro}</p>
      <div className="flex flex-wrap gap-xs">
        <Stamp
          label={t.ownerConfirmed}
          at={initial?.ownerConfirmedAt}
          waiting={t.waiting}
          locale={locale}
        />
        <Stamp
          label={t.guestConfirmed}
          at={initial?.guestConfirmedAt}
          waiting={t.waiting}
          locale={locale}
        />
      </div>

      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex flex-col gap-xs p-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="text-sm text-ink">{c.checklist[item.key] ?? item.key}</span>
            <div className="flex flex-wrap items-center gap-xs">
              {([true, false] as const).map((value) => (
                <button
                  key={String(value)}
                  type="button"
                  disabled={locked}
                  onClick={() => update(item.key, { ok: item.ok === value ? null : value })}
                  className={`rounded-full border px-md py-0.5 text-xs font-medium disabled:opacity-70 ${
                    item.ok === value
                      ? value
                        ? "border-turquoise bg-turquoise-light text-turquoise-dark"
                        : "border-red-300 bg-red-50 text-red-700"
                      : "border-border text-ink-secondary"
                  }`}
                >
                  {value ? `✓ ${t.ok}` : `! ${t.issue}`}
                </button>
              ))}
              {item.ok === false && (
                <input
                  value={item.note ?? ""}
                  disabled={locked}
                  onChange={(e) => update(item.key, { note: e.target.value })}
                  placeholder={t.notePlaceholder}
                  className="w-full rounded-sm border border-border bg-surface px-sm py-0.5 text-xs outline-none focus:border-turquoise sm:w-48"
                />
              )}
            </div>
          </li>
        ))}
      </ul>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.notes}</span>
        <textarea
          value={notes}
          disabled={locked}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {locked ? (
        <p className="text-sm font-medium text-turquoise-dark">{t.locked}</p>
      ) : (
        <div className="flex flex-wrap gap-sm">
          <button
            type="button"
            onClick={save}
            disabled={busy !== null}
            className="rounded-md border border-border px-lg py-sm text-sm font-medium hover:border-turquoise disabled:opacity-60"
          >
            {busy === "save" ? c.saving : t.save}
          </button>
          {!myConfirmation && (
            <button
              type="button"
              onClick={confirmIt}
              disabled={busy !== null}
              className="rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
            >
              {busy === "confirm" ? c.saving : t.confirm}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
