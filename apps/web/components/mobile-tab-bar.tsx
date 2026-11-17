"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { useLocale } from "@/lib/i18n/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionary";
import { Icon, type IconName } from "@/components/admin/icons";

/** Routes that have their own bottom action (or are full-screen flows). */
export function hidesTabBar(pathname: string | null) {
  if (!pathname) return true;
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/properties/") ||
    pathname.startsWith("/booking/") ||
    pathname === "/login" ||
    pathname === "/signup"
  );
}

/**
 * Phone-only bottom navigation for guests — thumb-reachable, always visible,
 * one tap to any main area (the header menu needs two).
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const { profile, loading } = useCurrentProfile();
  const t = getDictionary(useLocale()).nav;
  if (hidesTabBar(pathname)) return null;

  const items: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
    { href: "/", label: t.explore, icon: "compass", exact: true },
    { href: "/search", label: t.stays, icon: "search" },
    { href: "/account/bookings", label: t.bookings, icon: "calendar" },
    { href: "/account/favorites", label: t.favorites, icon: "heart" },
    profile || loading
      ? { href: "/profile", label: t.profile, icon: "user" }
      : { href: "/login", label: t.logIn, icon: "user" },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      aria-label="Main"
    >
      <ul className="mx-auto grid h-16 max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.exact ? pathname === item.href : pathname?.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition ${
                  active ? "text-turquoise-dark" : "text-ink-secondary"
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition ${active ? "bg-turquoise-light" : ""}`}
                >
                  <Icon name={item.icon} className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className="max-w-full truncate px-0.5">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
