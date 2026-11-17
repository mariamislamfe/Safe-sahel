import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { getOwnerPendingCount } from "@/lib/queries/owner-dashboard";
import { AdminShell, type ShellGroup } from "@/components/admin/shell";
import { BecomeHost } from "@/components/become-host";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/owner");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, host_type, verified, phone")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner" && profile?.role !== "admin") {
    return <BecomeHost profileId={user.id} phone={profile?.phone ?? null} />;
  }

  const locale = await getLocale();
  const nav = ownerDict[locale].nav;
  const d = dashboardDict[locale].host;
  const pending = await getOwnerPendingCount(user.id).catch(() => 0);

  const groups: ShellGroup[] = [
    {
      key: "today",
      label: d.groups.today!,
      items: [
        { href: "/owner", label: nav.overview, icon: "home" },
        {
          href: "/owner/bookings",
          label: nav.bookings,
          icon: "inbox",
          badge: pending,
          urgent: pending > 0,
        },
        { href: "/owner/calendar", label: nav.calendar, icon: "calendar" },
      ],
    },
    {
      key: "places",
      label: d.groups.places!,
      items: [
        {
          href: "/owner/listings",
          label: nav.listings,
          icon: "building",
          match: ["/owner/properties/"],
        },
      ],
    },
    {
      key: "account",
      label: d.groups.account!,
      items: [
        { href: "/owner/verification", label: nav.verification, icon: "shield" },
        { href: "/owner/subscription", label: nav.subscription, icon: "card" },
      ],
    },
  ];

  const role = profile.host_type === "broker" ? d.roleBroker : d.roleOwner;

  return (
    <AdminShell
      home="/owner"
      cta={{ href: "/owner/properties/new", label: d.addListing }}
      groups={groups}
      userName={profile.full_name ?? user.email ?? ""}
      roleLabel={profile.verified ? `${role} · ${d.verified} ✓` : role}
      brand={d.brand}
      viewSite={d.viewSite}
      menuLabel={d.menu}
      locale={locale}
    >
      {children}
    </AdminShell>
  );
}
