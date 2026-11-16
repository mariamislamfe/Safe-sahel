import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@safe-sahel/types";

/**
 * Email delivery for the notifications outbox.
 *
 * Provider hook: set RESEND_API_KEY + EMAIL_FROM to send through Resend.
 * Without them this is a stub — rows stay in `notifications` (shown in-app
 * on the dashboards) and `send_error` records why no email went out, so
 * nothing is lost once a provider is configured.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://safe-sahel.vercel.app";

type Email = { subject: string; text: string };

/** Bilingual email copy per notification kind (Arabic first, then English). */
export function renderNotification(kind: string, payload: Record<string, unknown>): Email {
  const ref = typeof payload.reference === "string" ? payload.reference : "";
  const bilingual = (
    subjectAr: string,
    subjectEn: string,
    ar: string,
    en: string,
    path = "/owner",
  ): Email => ({
    subject: `${subjectAr} · ${subjectEn}`,
    text: `${ar}\n\n${en}\n\n${SITE_URL}${path}`,
  });

  switch (kind) {
    case "calendar_review":
      return bilingual(
        "راجع الكالندر بتاعك",
        "Review your calendar",
        "راجع الكالندر بتاعك على Safe Sahel وتأكد إن الأيام المحجوزة بره المنصة متقفلة، عشان الضيوف ميبعتوش طلبات على أيام مش فاضية.",
        "Please review your Safe Sahel calendar and block any dates booked elsewhere, so guests only request dates that are really free.",
        "/owner/calendar",
      );
    case "booking_request":
      return bilingual(
        `طلب حجز جديد ${ref}`,
        `New booking request ${ref}`,
        "وصلك طلب حجز جديد. عندك ٢٤ ساعة تأكده أو ترفضه قبل ما ينتهي.",
        "You have a new booking request. Confirm or decline within 24 hours before it expires.",
        "/owner/bookings",
      );
    case "booking_confirmed":
      return bilingual(
        `المالك أكد حجزك ${ref}`,
        `Your booking ${ref} is confirmed`,
        "المالك أكد الحجز. افتح الحجز عشان تكلمه على واتساب وترفع بطايق البالغين لتصاريح البوابة.",
        "The owner confirmed. Open your booking to message them on WhatsApp and upload adult IDs for gate passes.",
        "/account/bookings",
      );
    case "booking_declined":
    case "booking_expired":
      return bilingual(
        `طلب الحجز ${ref} مكملش`,
        `Booking request ${ref} didn't go through`,
        "للأسف الطلب اترفض أو انتهت مهلته. مفيش أي فلوس اتدفعت — تقدر تبعت طلب لمكان تاني.",
        "Unfortunately the request was declined or expired. No money was paid — you can request another place.",
        "/search",
      );
    case "booking_cancelled_by_owner":
      return bilingual(
        `المالك لغى الحجز ${ref}`,
        `The owner cancelled booking ${ref}`,
        "المالك لغى الحجز. اتسجل عليه إنذار. لو حولت عربون، اتواصل معاه لاسترداده.",
        "The owner cancelled. A strike was recorded on their account. If you paid a deposit, contact them to get it back.",
        "/account/bookings",
      );
    case "subscription_expiring":
      return bilingual(
        "اشتراكك قرب يخلص",
        "Your subscription ends soon",
        "اشتراك شاليهك بيخلص خلال ٧ أيام. جدد عشان يفضل ظاهر للضيوف (في فترة سماح ٧ أيام بعد الانتهاء).",
        "Your listing's plan ends within 7 days. Renew to stay visible (there's a 7-day grace period after it ends).",
        "/owner/subscription",
      );
    case "free_period_ending":
      return bilingual(
        "الفترة المجانية قربت تخلص",
        "The free period is ending",
        "الفترة المجانية بتخلص يوم ١ أبريل. اختار باقة عشان شاليهك يفضل ظاهر — والملاك المؤسسين أسعارهم ثابتة سنتين.",
        "The free period ends on 1 April. Pick a plan to stay listed — Founding Hosts keep launch prices for 2 years.",
        "/owner/subscription",
      );
    default:
      return bilingual(
        "تحديث من Safe Sahel",
        "Update from Safe Sahel",
        "في تحديث جديد على حسابك.",
        "There's a new update on your account.",
      );
  }
}

/** Kinds worth an email; everything else is in-app only. */
const EMAIL_KINDS = new Set([
  "calendar_review",
  "booking_request",
  "booking_confirmed",
  "booking_declined",
  "booking_expired",
  "booking_cancelled_by_owner",
  "subscription_expiring",
  "free_period_ending",
]);

export async function sendEmail(
  to: string,
  email: Email,
): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    // TODO(founder): choose an email provider. Stub: logged, kept in outbox.
    console.info(`[notify:stub] would email ${to}: ${email.subject}`);
    return { ok: false, error: "email_provider_not_configured" };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: email.subject, text: email.text }),
  });
  return res.ok ? { ok: true } : { ok: false, error: `resend_${res.status}` };
}

/** Drain unsent email notifications (service-role client). */
export async function flushNotificationOutbox(admin: SupabaseClient<Database>, limit = 200) {
  const { data: rows } = await admin
    .from("notifications")
    .select("id, recipient_id, kind, payload")
    .is("sent_at", null)
    .is("send_error", null)
    .eq("channel", "email")
    .order("created_at")
    .limit(limit);

  let sent = 0;
  let skipped = 0;
  for (const row of rows ?? []) {
    if (!EMAIL_KINDS.has(row.kind)) {
      await admin.from("notifications").update({ send_error: "in_app_only" }).eq("id", row.id);
      skipped++;
      continue;
    }
    const { data: user } = await admin.auth.admin.getUserById(row.recipient_id);
    const to = user?.user?.email;
    if (!to) {
      await admin.from("notifications").update({ send_error: "no_email" }).eq("id", row.id);
      skipped++;
      continue;
    }
    const result = await sendEmail(to, renderNotification(row.kind, row.payload ?? {}));
    if (result.ok) {
      await admin
        .from("notifications")
        .update({ sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent++;
    } else if (result.error === "email_provider_not_configured") {
      // Leave unsent so it goes out once a provider is configured.
      skipped++;
    } else {
      await admin
        .from("notifications")
        .update({ send_error: result.error ?? "send_failed" })
        .eq("id", row.id);
      skipped++;
    }
  }
  return { sent, skipped };
}
