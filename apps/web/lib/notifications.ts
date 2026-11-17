/**
 * Shared by the in-app bell and the email outbox: where each notification
 * should take the user (deep link to the exact booking/listing when the
 * payload carries its id) and what it says.
 */

type Payload = Record<string, unknown> | null | undefined;

const str = (p: Payload, key: string) =>
  p && typeof p[key] === "string" ? (p[key] as string) : null;

export function notificationHref(kind: string, payload: Payload): string {
  const booking = str(payload, "booking_id");
  const property = str(payload, "property_id");
  switch (kind) {
    case "booking_request":
    case "booking_cancelled_by_guest":
    case "strike_received":
      return booking ? `/owner/bookings/${booking}` : "/owner/bookings";
    case "booking_confirmed":
    case "booking_declined":
    case "booking_expired":
    case "booking_cancelled_by_owner":
      return booking ? `/account/bookings/${booking}` : "/account/bookings";
    case "listing_hidden":
      return "/owner/listings";
    case "calendar_review":
      return "/owner/calendar";
    case "verification_approved":
    case "verification_rejected":
    case "verification_revoked":
      return "/owner/verification";
    case "authorization_approved":
    case "authorization_rejected":
      return property ? `/owner/properties/${property}/authorization` : "/owner/listings";
    case "payment_approved":
    case "payment_rejected":
    case "guarantee_granted":
    case "subscription_expiring":
    case "free_period_ending":
      return "/owner/subscription";
    default:
      return "/";
  }
}

/** Notifications that need the user to do something soon. */
export const URGENT_KINDS = new Set(["booking_request", "booking_confirmed"]);

const en: Record<string, (p: Payload) => string> = {
  booking_request: (p) => `New booking request ${str(p, "reference") ?? ""} — reply within 24h`,
  booking_cancelled_by_guest: (p) => `A guest cancelled ${str(p, "reference") ?? ""}`,
  booking_cancelled_by_owner: (p) => `The owner cancelled ${str(p, "reference") ?? ""}`,
  booking_confirmed: (p) => `Your booking ${str(p, "reference") ?? ""} is confirmed 🎉`,
  booking_declined: (p) => `Request ${str(p, "reference") ?? ""} was declined`,
  booking_expired: (p) => `Request ${str(p, "reference") ?? ""} expired — no reply`,
  listing_hidden: () => "One of your listings was hidden",
  calendar_review: () => "Time to review your calendar",
  verification_approved: () => "You're verified ✓",
  verification_rejected: () => "Verification wasn't approved",
  verification_revoked: () => "Your Verified badge was removed",
  authorization_approved: () => "Owner authorization approved",
  authorization_rejected: () => "Owner authorization rejected",
  payment_approved: () => "Payment approved",
  payment_rejected: () => "Payment rejected",
  guarantee_granted: () => "Season guarantee granted — free extension added",
  subscription_expiring: () => "A subscription ends soon",
  free_period_ending: () => "The free period is ending",
  strike_received: () => "You received a strike",
};

const ar: typeof en = {
  booking_request: (p) => `طلب حجز جديد ${str(p, "reference") ?? ""} — رد خلال 24 ساعة`,
  booking_cancelled_by_guest: (p) => `ضيف لغى الحجز ${str(p, "reference") ?? ""}`,
  booking_cancelled_by_owner: (p) => `المالك لغى الحجز ${str(p, "reference") ?? ""}`,
  booking_confirmed: (p) => `حجزك ${str(p, "reference") ?? ""} اتأكد 🎉`,
  booking_declined: (p) => `الطلب ${str(p, "reference") ?? ""} اترفض`,
  booking_expired: (p) => `الطلب ${str(p, "reference") ?? ""} انتهى من غير رد`,
  listing_hidden: () => "إعلان من إعلاناتك اتخفى",
  calendar_review: () => "وقت تراجع الكالندر",
  verification_approved: () => "حسابك اتوثق ✓",
  verification_rejected: () => "طلب التوثيق ماتقبلش",
  verification_revoked: () => "علامة التوثيق اتشالت",
  authorization_approved: () => "تفويض المالك اتقبل",
  authorization_rejected: () => "تفويض المالك اترفض",
  payment_approved: () => "الدفع اتقبل",
  payment_rejected: () => "الدفع اترفض",
  guarantee_granted: () => "ضمان الموسم اتفعّل — مدة مجانية اتضافت",
  subscription_expiring: () => "اشتراك قرب يخلص",
  free_period_ending: () => "الفترة المجانية قربت تخلص",
  strike_received: () => "اتسجل عليك إنذار",
};

export function notificationText(locale: "en" | "ar", kind: string, payload: Payload): string {
  const fn = (locale === "ar" ? ar : en)[kind];
  return fn ? fn(payload).trim() : locale === "ar" ? "تحديث جديد" : "New update";
}
