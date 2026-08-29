"use client";

import { useMemo, useState } from "react";
import type { DateRange } from "@/lib/queries/availability";

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function expandUnavailableDates(ranges: DateRange[]): Set<string> {
  const set = new Set<string>();
  for (const range of ranges) {
    const cursor = new Date(range.start + "T00:00:00");
    const end = new Date(range.end + "T00:00:00");
    while (cursor < end) {
      set.add(toIso(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return set;
}

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" });

export function DateRangeCalendar({
  checkIn,
  checkOut,
  onChange,
  unavailableRanges,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
  unavailableRanges: DateRange[];
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = checkIn ? new Date(checkIn + "T00:00:00") : new Date(today);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const unavailable = useMemo(() => expandUnavailableDates(unavailableRanges), [unavailableRanges]);

  function hasUnavailableBetween(startIso: string, endIso: string) {
    const cursor = new Date(startIso + "T00:00:00");
    const end = new Date(endIso + "T00:00:00");
    while (cursor < end) {
      if (unavailable.has(toIso(cursor))) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  }

  function handleClick(iso: string) {
    if (!checkIn || (checkIn && checkOut)) {
      onChange(iso, "");
      return;
    }
    // Mid-selection, picking the end date.
    if (iso <= checkIn) {
      onChange(iso, "");
      return;
    }
    if (hasUnavailableBetween(checkIn, iso)) {
      // Can't span a booked date — restart from this date instead.
      onChange(iso, "");
      return;
    }
    onChange(checkIn, iso);
  }

  const firstOfMonth = viewMonth;
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0).getDate();
  const leadingBlanks = firstOfMonth.getDay();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from(
      { length: daysInMonth },
      (_, i) => new Date(viewMonth.getFullYear(), viewMonth.getMonth(), i + 1),
    ),
  ];

  return (
    <div className="flex flex-col gap-md rounded-xl border border-border p-lg">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))
          }
          className="flex size-9 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-soft"
          aria-label="Previous month"
        >
          ‹
        </button>
        <p className="font-display text-base font-semibold text-ink">
          {monthFormatter.format(viewMonth)}
        </p>
        <button
          type="button"
          onClick={() =>
            setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))
          }
          className="flex size-9 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-soft"
          aria-label="Next month"
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-ink-secondary">
        {weekdayLabels.map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((date, i) => {
          if (!date) return <div key={`blank-${i}`} />;
          const iso = toIso(date);
          const isPast = date < today;
          const isBooked = unavailable.has(iso);
          const isCheckIn = iso === checkIn;
          const isCheckOut = iso === checkOut;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;
          const disabled = isPast || (isBooked && !isCheckIn);

          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(iso)}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-sm transition-colors sm:h-12 sm:w-12 sm:text-base ${
                isCheckIn || isCheckOut
                  ? "bg-turquoise font-semibold text-white"
                  : inRange
                    ? "bg-turquoise-light text-turquoise-dark"
                    : isBooked
                      ? "bg-red-50 text-red-300 line-through"
                      : isPast
                        ? "text-ink-secondary/40"
                        : "text-ink hover:bg-surface-soft"
              }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-lg text-xs text-ink-secondary">
        <span className="flex items-center gap-xs">
          <span className="size-3 rounded-full bg-turquoise" /> Selected
        </span>
        <span className="flex items-center gap-xs">
          <span className="size-3 rounded-full bg-red-50" /> Unavailable
        </span>
      </div>
    </div>
  );
}
