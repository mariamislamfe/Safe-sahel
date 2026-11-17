"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale } from "@/lib/i18n/locale-provider";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { Icon, type IconName } from "@/components/admin/icons";

/**
 * Guest-side "account" frame: same visual language as the dashboards
 * (soft grey canvas, white cards) but keeps the public header — guests are
 * still browsing, so they shouldn't feel they left the site.
 */
export function AccountShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const t = dashboardDict[useLocale()].account;
  const tabs: { href: string; label: string; icon: IconName }[] = [
    { href: "/account/bookings", label: t.tabs.bookings, icon: "calendar" },
    { href: "/account/favorites", label: t.tabs.favorites, icon: "heart" },
    { href: "/profile", label: t.tabs.profile, icon: "user" },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F7F8FA]">
      <div className="mx-auto flex max-w-5xl flex-col gap-xl px-lg py-xl sm:py-2xl">
        <nav className="-mx-lg overflow-x-auto px-lg [scrollbar-width:none]">
          <div className="inline-flex gap-1 rounded-2xl border border-border bg-surface p-1 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            {tabs.map((tab) => {
              const active = pathname?.startsWith(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex shrink-0 items-center gap-xs whitespace-nowrap rounded-xl px-md py-2 text-sm font-medium transition ${
                    active
                      ? "bg-turquoise-light text-turquoise-dark"
                      : "text-ink-secondary hover:bg-surface-soft hover:text-ink"
                  }`}
                >
                  <Icon name={tab.icon} className="size-4" />
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
        {children}
      </div>
    </div>
  );
}
