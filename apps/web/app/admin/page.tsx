import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatEgp } from "@safe-sahel/utils";

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    { count: userCount },
    { count: ownerCount },
    { count: propertyCount },
    { count: publishedCount },
    { count: activeSubscriptions },
    { count: bookingCount },
    { count: pendingVerifications },
    { data: priceSetting },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .in("role", ["owner", "admin"]),
    supabase.from("properties").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("status", "published")
      .is("deleted_at", null),
    supabase
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("subscription_status", "active")
      .is("deleted_at", null),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase
      .from("verification_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "owner_subscription_price_egp")
      .maybeSingle(),
  ]);

  const subscriptionPrice = typeof priceSetting?.value === "number" ? priceSetting.value : 500;
  const mrr = (activeSubscriptions ?? 0) * subscriptionPrice;

  const revenueStats = [
    {
      label: "Active subscriptions",
      value: activeSubscriptions ?? 0,
      href: "/admin/subscription-codes",
    },
    { label: "Monthly revenue (est.)", value: formatEgp(mrr), href: "/admin/settings" },
    {
      label: "Price per property / month",
      value: formatEgp(subscriptionPrice),
      href: "/admin/settings",
    },
  ];

  const stats = [
    { label: "Total users", value: userCount ?? 0, href: "/admin/users" },
    { label: "Owners", value: ownerCount ?? 0, href: "/admin/users" },
    { label: "Properties", value: propertyCount ?? 0, href: "/admin/properties" },
    { label: "Published", value: publishedCount ?? 0, href: "/admin/properties" },
    { label: "Bookings", value: bookingCount ?? 0, href: "/admin/bookings" },
    {
      label: "Pending verifications",
      value: pendingVerifications ?? 0,
      href: "/admin/verification",
      highlight: (pendingVerifications ?? 0) > 0,
    },
  ];

  return (
    <div className="flex flex-col gap-2xl">
      <div className="flex flex-col gap-md">
        <h1 className="font-display text-2xl font-bold">Overview</h1>
        <p className="text-sm font-medium uppercase tracking-wide text-ink-secondary">
          Subscriptions
        </p>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
          {revenueStats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-xl border border-turquoise bg-turquoise-light p-lg transition-colors hover:bg-turquoise-light/70"
            >
              <p className="font-display text-3xl font-bold text-turquoise-dark">{stat.value}</p>
              <p className="text-sm text-ink-secondary">{stat.label}</p>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-md">
        <p className="text-sm font-medium uppercase tracking-wide text-ink-secondary">Platform</p>
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className={`rounded-lg border p-lg transition-colors hover:border-turquoise ${
                stat.highlight ? "border-butter bg-butter-soft" : "border-border"
              }`}
            >
              <p className="font-display text-2xl font-bold text-ink">{stat.value}</p>
              <p className="text-sm text-ink-secondary">{stat.label}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
