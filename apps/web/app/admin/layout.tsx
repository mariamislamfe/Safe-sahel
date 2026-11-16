import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { AdminNav } from "@/components/admin-nav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  const t = adminDict[await getLocale()].nav;
  const groups = [
    [
      { href: "/admin", label: t.overview },
      { href: "/admin/verification", label: t.verification },
      { href: "/admin/payments", label: t.payments },
      { href: "/admin/subscriptions", label: t.subscriptions },
      { href: "/admin/properties", label: t.listings },
      { href: "/admin/guarantee", label: t.guarantee },
      { href: "/admin/featured", label: t.featured },
    ],
    [
      { href: "/admin/kpis", label: t.kpis },
      { href: "/admin/targets", label: t.targets },
      { href: "/admin/finance", label: t.finance },
      { href: "/admin/access-log", label: t.accessLog },
    ],
    [
      { href: "/admin/bookings", label: t.bookings },
      { href: "/admin/users", label: t.users },
      { href: "/admin/compounds", label: t.compounds },
      { href: "/admin/amenities", label: t.amenities },
      { href: "/admin/handovers", label: t.handovers },
      { href: "/admin/settings", label: t.settings },
    ],
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-xl px-lg py-xl sm:py-2xl">
      <AdminNav groups={groups} />
      {children}
    </div>
  );
}
