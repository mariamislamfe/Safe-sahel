import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { hoursSince } from "@/lib/queries/admin";

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  await supabase.rpc("expire_stale_bookings");
  const t = adminDict[await getLocale()].overview;
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000).toISOString();

  const [
    { data: pendingVerifications },
    { count: pendingAuth },
    { count: pendingPayments },
    { data: guarantee },
    { count: flagged },
    { count: duplicates },
    { count: expiring },
    { count: pendingBookings },
    { count: live },
    { count: owners },
    { count: users },
    { count: bookings },
  ] = await Promise.all([
    supabase
      .from("verification_requests")
      .select("created_at")
      .in("status", ["pending", "contacted"])
      .order("created_at"),
    supabase
      .from("broker_authorizations")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("subscription_payments")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase.rpc("guarantee_status"),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("flagged_for_review", true)
      .is("deleted_at", null),
    supabase
      .from("listing_duplicate_flags")
      .select("*", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("listing_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("ends_at", now.toISOString())
      .lte("ends_at", in7),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("role", ["owner", "admin"]),
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
  ]);

  const oldestVerification = pendingVerifications?.[0]?.created_at;
  const queues = [
    {
      label: t.verifications,
      value: pendingVerifications?.length ?? 0,
      href: "/admin/verification",
      note: oldestVerification ? t.oldest(hoursSince(oldestVerification)) : null,
      urgent: oldestVerification ? hoursSince(oldestVerification) >= 24 : false,
    },
    { label: t.authorizations, value: pendingAuth ?? 0, href: "/admin/verification" },
    { label: t.payments, value: pendingPayments ?? 0, href: "/admin/payments" },
    {
      label: t.guarantee,
      value: (guarantee ?? []).filter((g) => g.status === "eligible").length,
      href: "/admin/guarantee",
    },
    { label: t.flagged, value: flagged ?? 0, href: "/admin/properties?f=flagged" },
    { label: t.duplicates, value: duplicates ?? 0, href: "/admin/properties?f=duplicates" },
    { label: t.expiring, value: expiring ?? 0, href: "/admin/subscriptions?f=expiring" },
    { label: t.pendingBookings, value: pendingBookings ?? 0, href: "/admin/bookings" },
  ];
  const platform = [
    { label: t.live, value: live ?? 0, href: "/admin/properties?f=live" },
    { label: t.owners, value: owners ?? 0, href: "/admin/users" },
    { label: t.users, value: users ?? 0, href: "/admin/users" },
    { label: t.bookings, value: bookings ?? 0, href: "/admin/bookings" },
  ];

  return (
    <div className="flex flex-col gap-2xl">
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>
      <section className="flex flex-col gap-md">
        <p className="text-sm font-medium uppercase tracking-wide text-ink-secondary">{t.queues}</p>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
          {queues.map((q) => (
            <Link
              key={q.label}
              href={q.href}
              className={`flex flex-col gap-0.5 rounded-2xl border p-lg transition-colors hover:border-turquoise ${
                q.urgent
                  ? "border-red-300 bg-red-50"
                  : q.value > 0
                    ? "border-butter bg-butter-soft"
                    : "border-border"
              }`}
            >
              <span className="font-display text-3xl font-bold">{q.value}</span>
              <span className="text-sm text-ink-secondary">{q.label}</span>
              {q.note && (
                <span
                  className={`text-xs ${q.urgent ? "font-semibold text-red-700" : "text-ink-secondary"}`}
                >
                  {q.note}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
      <section className="flex flex-col gap-md">
        <p className="text-sm font-medium uppercase tracking-wide text-ink-secondary">
          {t.platform}
        </p>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
          {platform.map((p) => (
            <Link
              key={p.label}
              href={p.href}
              className="rounded-2xl border border-border p-lg hover:border-turquoise"
            >
              <p className="font-display text-2xl font-bold">{p.value}</p>
              <p className="text-sm text-ink-secondary">{p.label}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
