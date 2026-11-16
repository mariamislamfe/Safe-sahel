"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { date } from "@/lib/i18n/format";

export type CalendarBlock = {
  id: string;
  start: string;
  end: string;
  reason: "owner_blocked" | "booked" | "pending_hold";
  reference: string | null | undefined;
};

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function OwnerCalendar({
  propertyId,
  blocks,
  lastUpdated,
}: {
  propertyId: string;
  blocks: CalendarBlock[];
  lastUpdated: string | null;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].calendar;
  const c = common[locale];
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState(false);

  const dayState = useMemo(() => {
    const map = new Map<string, "booked" | "manual">();
    for (const b of blocks) {
      for (let d = new Date(`${b.start}T00:00:00`); iso(d) < b.end; d.setDate(d.getDate() + 1)) {
        map.set(iso(d), b.reason === "owner_blocked" ? "manual" : "booked");
      }
    }
    return map;
  }, [blocks]);

  const months = useMemo(() => {
    const first = new Date();
    first.setDate(1);
    return [0, 1, 2].map((offset) => new Date(first.getFullYear(), first.getMonth() + offset, 1));
  }, []);

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!from || !to || to <= from) return setError(c.errors.invalid_dates!);
    setBusy(true);
    setError(null);
    const { error: insertError } = await createClient()
      .from("availability_blocks")
      .insert({ property_id: propertyId, range: `[${from},${to})`, reason: "owner_blocked" });
    setBusy(false);
    if (insertError)
      return setError(
        insertError.message.includes("exclu") || insertError.code === "23P01"
          ? t.overlap
          : insertError.message,
      );
    setFrom("");
    setTo("");
    router.refresh();
  }

  async function remove(id: string) {
    await createClient()
      .from("availability_blocks")
      .delete()
      .eq("id", id)
      .eq("reason", "owner_blocked");
    router.refresh();
  }

  async function markReviewed() {
    const { error: e } = await createClient().rpc("mark_calendar_reviewed", {
      p_property_id: propertyId,
    });
    if (!e) {
      setReviewed(true);
      router.refresh();
    }
  }

  const weekdayFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    weekday: "narrow",
  });
  const monthFmt = new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    month: "long",
    year: "numeric",
  });
  const weekdays = [...Array(7)].map((_, i) => weekdayFmt.format(new Date(2024, 0, 6 + i))); // Sat-first (Egypt)
  const today = iso(new Date());

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-wrap items-center justify-between gap-sm rounded-2xl bg-surface-soft px-lg py-md">
        <p className="text-sm">
          {t.lastUpdated}:{" "}
          <span className="font-semibold">{lastUpdated ? date(locale, lastUpdated) : t.never}</span>
        </p>
        <button
          onClick={markReviewed}
          className="rounded-md bg-turquoise px-md py-xs text-sm font-semibold text-white hover:bg-turquoise-dark"
        >
          {reviewed ? t.reviewedNow : `✓ ${t.markReviewed}`}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
        {months.map((m) => {
          const startPad = (m.getDay() + 1) % 7; // Saturday-first grid
          const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          return (
            <div key={m.toISOString()} className="flex flex-col gap-xs">
              <p className="text-sm font-semibold">{monthFmt.format(m)}</p>
              <div className="grid grid-cols-7 gap-0.5 text-center text-[11px]">
                {weekdays.map((w, i) => (
                  <span key={i} className="text-ink-secondary">
                    {w}
                  </span>
                ))}
                {[...Array(startPad)].map((_, i) => (
                  <span key={`p${i}`} />
                ))}
                {[...Array(days)].map((_, i) => {
                  const d = iso(new Date(m.getFullYear(), m.getMonth(), i + 1));
                  const state = dayState.get(d);
                  return (
                    <span
                      key={d}
                      className={`rounded py-1 tabular-nums ${
                        state === "booked"
                          ? "bg-turquoise text-white"
                          : state === "manual"
                            ? "bg-ink/70 text-white"
                            : d < today
                              ? "text-ink-secondary/50"
                              : "bg-surface-soft"
                      }`}
                    >
                      {i + 1}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-md text-xs text-ink-secondary">
        <span className="flex items-center gap-xs">
          <span className="size-3 rounded bg-turquoise" /> {t.booking}
        </span>
        <span className="flex items-center gap-xs">
          <span className="size-3 rounded bg-ink/70" /> {t.manual}
        </span>
      </div>

      <form
        onSubmit={addBlock}
        className="flex flex-col gap-sm rounded-2xl border border-border p-lg"
      >
        <p className="font-display font-semibold">{t.blockTitle}</p>
        <div className="grid grid-cols-2 gap-sm">
          <label className="flex flex-col gap-xs text-sm">
            {t.from}
            <input
              type="date"
              value={from}
              min={today}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-sm border border-border bg-surface px-sm py-xs"
            />
          </label>
          <label className="flex flex-col gap-xs text-sm">
            {t.to}
            <input
              type="date"
              value={to}
              min={from || today}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-sm border border-border bg-surface px-sm py-xs"
            />
          </label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={busy}
          className="w-fit rounded-md bg-ink px-lg py-sm text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? t.blocking : t.block}
        </button>
      </form>

      <div className="flex flex-col gap-sm">
        <p className="font-display font-semibold">{t.blocks}</p>
        {blocks.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.noBlocks}</p>
        ) : (
          <ul className="flex flex-col gap-xs">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-sm rounded-lg border border-border px-md py-sm text-sm"
              >
                <span>
                  {date(locale, b.start)} → {date(locale, b.end)} ·{" "}
                  <span className="text-ink-secondary">
                    {b.reason === "owner_blocked"
                      ? t.manual
                      : `${t.booking}${b.reference ? ` · ${b.reference}` : ""}`}
                  </span>
                </span>
                {b.reason === "owner_blocked" && (
                  <button
                    onClick={() => remove(b.id)}
                    className="text-xs font-medium text-red-600 hover:underline"
                  >
                    {t.remove}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
