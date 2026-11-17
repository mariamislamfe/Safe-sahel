import { cache } from "react";
import { redirect } from "next/navigation";
import type { AdminAccess, AdminPermission } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";
import type { IconName } from "@/components/admin/icons";

export type AdminSectionKey =
  | "overview"
  | "verification"
  | "listings"
  | "accessLog"
  | "payments"
  | "subscriptions"
  | "featured"
  | "guarantee"
  | "bookings"
  | "handovers"
  | "users"
  | "kpis"
  | "targets"
  | "finance"
  | "compounds"
  | "amenities"
  | "team"
  | "settings";

/** `null` = any team member, `"founder"` = founder only. */
type Requirement = AdminPermission | "founder" | null;

export type AdminSection = {
  key: AdminSectionKey;
  href: string;
  group: "today" | "trust" | "money" | "ops" | "growth" | "setup";
  icon: IconName;
  requires: Requirement;
};

export const ADMIN_SECTIONS: AdminSection[] = [
  { key: "overview", href: "/admin", group: "today", icon: "home", requires: null },
  {
    key: "verification",
    href: "/admin/verification",
    group: "trust",
    icon: "shield",
    requires: "verification",
  },
  {
    key: "listings",
    href: "/admin/properties",
    group: "trust",
    icon: "building",
    requires: "listings",
  },
  {
    key: "accessLog",
    href: "/admin/access-log",
    group: "trust",
    icon: "eye",
    requires: "security",
  },
  { key: "payments", href: "/admin/payments", group: "money", icon: "card", requires: "payments" },
  {
    key: "subscriptions",
    href: "/admin/subscriptions",
    group: "money",
    icon: "repeat",
    requires: "payments",
  },
  { key: "featured", href: "/admin/featured", group: "money", icon: "star", requires: "payments" },
  {
    key: "guarantee",
    href: "/admin/guarantee",
    group: "money",
    icon: "gift",
    requires: "payments",
  },
  {
    key: "bookings",
    href: "/admin/bookings",
    group: "ops",
    icon: "calendar",
    requires: "bookings",
  },
  {
    key: "handovers",
    href: "/admin/handovers",
    group: "ops",
    icon: "clipboard",
    requires: "bookings",
  },
  { key: "users", href: "/admin/users", group: "ops", icon: "users", requires: "users" },
  { key: "kpis", href: "/admin/kpis", group: "growth", icon: "chart", requires: "reports" },
  { key: "targets", href: "/admin/targets", group: "growth", icon: "target", requires: "reports" },
  { key: "finance", href: "/admin/finance", group: "growth", icon: "wallet", requires: "reports" },
  { key: "compounds", href: "/admin/compounds", group: "setup", icon: "map", requires: "catalog" },
  {
    key: "amenities",
    href: "/admin/amenities",
    group: "setup",
    icon: "sparkles",
    requires: "catalog",
  },
  { key: "team", href: "/admin/team", group: "setup", icon: "team", requires: "founder" },
  {
    key: "settings",
    href: "/admin/settings",
    group: "setup",
    icon: "settings",
    requires: "founder",
  },
];

/** Who's looking at the dashboard. `null` = not founder and not on the team. */
export const getAdminAccess = cache(async (): Promise<AdminAccess | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc("my_admin_access");
  if (!error) return data ?? null;

  // 0019 not applied yet → fall back to the founder-only check.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return profile?.role === "admin"
    ? {
        founder: true,
        title: null,
        permissions: [
          "verification",
          "listings",
          "bookings",
          "payments",
          "reports",
          "users",
          "catalog",
          "security",
        ],
      }
    : null;
});

export function canAccess(access: AdminAccess | null, requires: Requirement): boolean {
  if (!access) return false;
  if (access.founder) return true;
  if (requires === "founder") return false;
  if (requires === null) return true;
  return access.permissions.includes(requires);
}

export function hasPermission(access: AdminAccess | null, permission: AdminPermission) {
  return canAccess(access, permission);
}

/** Call at the top of every admin page. Redirects away when not allowed. */
export async function requireSection(key: AdminSectionKey): Promise<AdminAccess> {
  const access = await getAdminAccess();
  if (!access) redirect("/");
  const section = ADMIN_SECTIONS.find((s) => s.key === key)!;
  if (!canAccess(access, section.requires)) redirect("/admin?denied=1");
  return access;
}
