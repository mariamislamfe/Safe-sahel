/**
 * Pure booking / contact helpers shared by web + mobile.
 * Self-contained (no relative imports) so `node --test` can load it directly.
 */

/** Egyptian mobile numbers → wa.me format (country code, digits only). */
export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("20")) return digits;
  if (digits.startsWith("0")) return `20${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("1")) return `20${digits}`;
  return digits;
}

export function whatsAppUrl(phone: string, message?: string): string {
  const base = `https://wa.me/${toWhatsAppNumber(phone)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Prefilled first message after the owner confirms — always mentions the
 * booking reference and that the guest came from Safe Sahel, in both
 * languages so either side can read it.
 */
export function bookingWhatsAppMessage(input: {
  reference: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guestName?: string | null;
}): string {
  const name = input.guestName?.trim();
  return [
    `السلام عليكم${name ? `، معاك ${name}` : ""}. جاي من Safe Sahel 🌊`,
    `حجز رقم ${input.reference} — ${input.propertyTitle}`,
    `من ${input.checkIn} لـ ${input.checkOut}. محتاج أتفق معاك على العربون وميعاد الوصول.`,
    "",
    `Hi${name ? `, this is ${name}` : ""} — I found you on Safe Sahel.`,
    `Booking ref ${input.reference} · ${input.propertyTitle} · ${input.checkIn} → ${input.checkOut}.`,
  ].join("\n");
}

export type Countdown = { expired: boolean; hours: number; minutes: number; totalMinutes: number };

/** Time left until an ISO timestamp (e.g. a pending request's 24h expiry). */
export function countdownTo(expiresAtIso: string, now: Date = new Date()): Countdown {
  const ms = new Date(expiresAtIso).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0)
    return { expired: true, hours: 0, minutes: 0, totalMinutes: 0 };
  const totalMinutes = Math.floor(ms / 60_000);
  return {
    expired: false,
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
    totalMinutes,
  };
}

/** Whole days between an ISO timestamp and now (never negative). */
export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const ms = now.getTime() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/**
 * The DB raises `listing_not_publishable:min_photos,owner_not_verified` —
 * pull the reason codes out of whatever error message Supabase hands back.
 */
export function parsePublishBlockers(message: string | null | undefined): string[] {
  if (!message) return [];
  const match = message.match(/listing_not_publishable:([a-z_,]+)/);
  return match ? match[1]!.split(",").filter(Boolean) : [];
}

/** Our RPCs raise short snake_case codes; extract the first one from an error message. */
export function rpcErrorCode(message: string | null | undefined): string | null {
  if (!message) return null;
  if (message.includes("row-level security")) return "not_authorized";
  if (message.includes("permission denied")) return "not_authorized";
  if (message.includes("properties_unique_unit_per_compound")) return "duplicate_unit";
  const match = message.match(/^([a-z][a-z_]+)(?::|$)/);
  return match ? match[1]! : null;
}

/** Start/end (UTC instants) of the Cairo calendar month containing `date`. */
export function cairoMonthRange(
  date: Date = new Date(),
  offsetMonths = 0,
): { from: Date; to: Date } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value) - 1 + offsetMonths;
  return { from: cairoMidnight(year, month, 1), to: cairoMidnight(year, month + 1, 1) };
}

/** UTC instant of 00:00 Cairo time on the given (possibly overflowing) date. */
export function cairoMidnight(year: number, monthIndex: number, day: number): Date {
  const guess = new Date(Date.UTC(year, monthIndex, day, 0, 0, 0));
  const cairoHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Africa/Cairo",
      hour: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(guess)
      .find((p) => p.type === "hour")!.value,
  );
  // Cairo is UTC+2 or UTC+3, so midnight UTC reads as 02:00/03:00 there.
  return new Date(guess.getTime() - cairoHour * 3_600_000);
}

/** Week-over-week change as a rounded percentage; null when there's no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Random, non-identifying storage filename that keeps the extension. */
export function safeStorageName(originalName: string, random: string): string {
  const ext = originalName.includes(".") ? originalName.split(".").pop()!.toLowerCase() : "";
  const cleanExt = /^[a-z0-9]{1,5}$/.test(ext) ? `.${ext}` : "";
  return `${random}${cleanExt}`;
}
