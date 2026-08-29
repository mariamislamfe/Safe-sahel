import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const tabs = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/verification", label: "Verification" },
  { href: "/admin/handovers", label: "Handovers" },
  { href: "/admin/subscription-codes", label: "Subscription codes" },
  { href: "/admin/compounds", label: "Compounds" },
  { href: "/admin/amenities", label: "Amenities" },
  { href: "/admin/settings", label: "Settings" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-xl px-lg py-2xl">
      <nav className="flex flex-wrap gap-md border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-xs pb-md text-sm font-medium text-ink-secondary hover:border-turquoise hover:text-ink"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
