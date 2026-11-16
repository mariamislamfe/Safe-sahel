import type { Locale } from "@safe-sahel/types";

// Latin digits in Arabic too — that's what Egyptian users see on prices,
// InstaPay and WhatsApp, and it keeps numbers copy-pasteable.
const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB");

export function money(locale: Locale, amount: number): string {
  const n = Math.round(amount).toLocaleString("en-US");
  return locale === "ar" ? `${n} جنيه` : `EGP ${n}`;
}

export function num(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

export function date(locale: Locale, iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(iso.length === 10 ? {} : { timeZone: "Africa/Cairo" }),
  }).format(d);
}

export function dateTime(locale: Locale, iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  }).format(new Date(iso));
}

export function monthName(locale: Locale, d: Date): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Cairo",
  }).format(d);
}
