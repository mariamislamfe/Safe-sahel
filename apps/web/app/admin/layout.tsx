import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { ADMIN_SECTIONS, canAccess, getAdminAccess } from "@/lib/admin-access";
import { getQueueCounts } from "@/lib/queries/admin";
import { AdminShell, type ShellGroup } from "@/components/admin/shell";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/admin");

  const access = await getAdminAccess();
  if (!access) redirect("/");

  const locale = await getLocale();
  const nav = adminDict[locale].nav;
  const s = adminShellDict[locale];
  const [{ data: profile }, counts] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    getQueueCounts(access),
  ]);

  const labels: Record<string, string> = { ...nav, team: s.nav.team };
  const badges: Record<string, { n: number; urgent?: boolean }> = {
    verification: {
      n: counts.verifications + counts.authorizations,
      urgent: counts.verificationOverdue,
    },
    listings: { n: counts.flagged + counts.duplicates },
    payments: { n: counts.payments },
    bookings: { n: counts.pendingBookings },
  };

  const groups: ShellGroup[] = (["today", "trust", "money", "ops", "growth", "setup"] as const)
    .map((g) => ({
      key: g,
      label: s.groups[g]!,
      items: ADMIN_SECTIONS.filter((sec) => sec.group === g && canAccess(access, sec.requires)).map(
        (sec) => ({
          href: sec.href,
          label: labels[sec.key] ?? sec.key,
          icon: sec.icon,
          badge: badges[sec.key]?.n,
          urgent: badges[sec.key]?.urgent,
        }),
      ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <AdminShell
      groups={groups}
      userName={profile?.full_name ?? user.email ?? ""}
      roleLabel={access.founder ? s.founder : (access.title ?? "")}
      brand={s.brand}
      viewSite={s.viewSite}
      menuLabel={s.menu}
      locale={locale}
    >
      {children}
    </AdminShell>
  );
}
