"use client";

import { useEffect, useState } from "react";
import { countdownTo } from "@safe-sahel/utils";
import { useLocale } from "@/lib/i18n/locale-provider";
import { common } from "@/lib/i18n/common";

const statusStyles: Record<string, string> = {
  pending: "bg-butter-soft text-ink",
  pending_payment: "bg-butter-soft text-ink",
  confirmed: "bg-turquoise-light text-turquoise-dark",
  declined: "bg-red-50 text-red-700",
  expired: "bg-surface-soft text-ink-secondary",
  cancelled: "bg-surface-soft text-ink-secondary",
  completed: "bg-surface-soft text-ink-secondary",
};

export function BookingStatusBadge({ status }: { status: string }) {
  const t = common[useLocale()];
  return (
    <span
      className={`whitespace-nowrap rounded-full px-sm py-xs text-xs font-medium ${statusStyles[status] ?? ""}`}
    >
      {t.bookingStatus[status] ?? status}
    </span>
  );
}

/** Live countdown to a pending request's 24h expiry. Turns red under 3h. */
export function ExpiryCountdown({
  expiresAt,
  prefix,
}: {
  expiresAt: string;
  prefix?: (s: string) => string;
}) {
  const locale = useLocale();
  const t = common[locale];
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);

  if (!now) return null;
  const c = countdownTo(expiresAt, now);
  const text = c.expired ? t.bookingStatus.expired! : t.hoursMinutesLeft(c.hours, c.minutes);
  const urgent = !c.expired && c.totalMinutes < 180;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-sm py-0.5 text-xs font-semibold tabular-nums ${
        c.expired
          ? "bg-surface-soft text-ink-secondary"
          : urgent
            ? "bg-red-50 text-red-700"
            : "bg-butter-soft text-ink"
      }`}
    >
      ⏳ {prefix ? prefix(text) : text}
    </span>
  );
}
