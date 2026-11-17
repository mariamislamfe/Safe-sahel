"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Locale } from "@safe-sahel/types";
import { Icon, type IconName } from "@/components/admin/icons";
import { LocaleToggle } from "@/app/locale-toggle";
import { NotificationBell } from "@/components/notification-bell";

export type ShellItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  urgent?: boolean;
  /** Extra path prefixes that should also mark this item active. */
  match?: string[];
};
export type ShellGroup = { key: string; label: string; items: ShellItem[] };

function isActive(pathname: string | null, item: ShellItem, home: string) {
  if (!pathname) return false;
  if (item.href === home) return pathname === home;
  return pathname.startsWith(item.href) || !!item.match?.some((m) => pathname.startsWith(m));
}

function NavList({
  groups,
  home,
  onNavigate,
}: {
  groups: ShellGroup[];
  home: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-lg">
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-0.5">
          <p className="px-sm pb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-secondary/80">
            {g.label}
          </p>
          {g.items.map((item) => {
            const active = isActive(pathname, item, home);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-sm rounded-lg px-sm py-2 text-sm font-medium transition ${
                  active
                    ? "bg-turquoise-light text-turquoise-dark"
                    : "text-ink-secondary hover:bg-surface-soft hover:text-ink"
                }`}
              >
                <Icon
                  name={item.icon}
                  className={`size-[18px] shrink-0 ${active ? "text-turquoise-dark" : "text-ink-secondary group-hover:text-ink"}`}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {!!item.badge && (
                  <span
                    className={`min-w-5 rounded-full px-1.5 py-px text-center text-[11px] font-bold tabular-nums ${
                      item.urgent ? "bg-red-500 text-white" : "bg-ink text-white"
                    }`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/**
 * Full-screen dashboard frame (sidebar on desktop, drawer on phones).
 * Used by both the admin console and the host dashboard.
 */
export function AdminShell({
  home = "/admin",
  cta,
  groups,
  userName,
  roleLabel,
  brand,
  viewSite,
  menuLabel,
  locale,
  children,
}: {
  home?: string;
  /** Primary action pinned above the nav (e.g. "Add listing"). */
  cta?: { href: string; label: string };
  groups: ShellGroup[];
  userName: string;
  roleLabel: string;
  brand: string;
  viewSite: string;
  menuLabel: string;
  locale: Locale;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const current = groups.flatMap((g) => g.items).find((i) => isActive(pathname, i, home));
  const totalBadges = groups
    .flatMap((g) => g.items)
    .reduce((s, i) => s + (i.badge && i.href !== home ? i.badge : 0), 0);

  // Lock page scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const logo = (
    <Link href={home} className="flex items-center gap-sm" onClick={() => setOpen(false)}>
      <span className="grid size-8 place-items-center rounded-lg bg-turquoise font-display text-sm font-extrabold text-white">
        SS
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-sm font-bold">Safe Sahel</span>
        <span className="text-[11px] text-ink-secondary">{brand}</span>
      </span>
    </Link>
  );

  const ctaButton = cta && (
    <Link
      href={cta.href}
      onClick={() => setOpen(false)}
      className="flex items-center justify-center gap-xs rounded-xl bg-turquoise px-md py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-turquoise-dark"
    >
      <Icon name="plus" className="size-4" strokeWidth={2.4} />
      {cta.label}
    </Link>
  );

  const footer = (
    <div className="flex flex-col gap-sm border-t border-border pt-md">
      <div className="flex items-center gap-sm px-sm">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-xs font-bold text-white">
          {(userName || "?").trim().charAt(0).toUpperCase()}
        </span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{userName}</span>
          <span className="truncate text-[11px] text-ink-secondary">{roleLabel}</span>
        </span>
      </div>
      <div className="flex items-center gap-xs">
        <Link
          href="/"
          className="flex flex-1 items-center justify-center gap-xs rounded-md border border-border px-sm py-sm text-sm font-medium text-ink-secondary hover:border-turquoise hover:text-turquoise-dark"
        >
          <Icon name="external" className="size-4" />
          {viewSite}
        </Link>
        <LocaleToggle locale={locale} />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 flex-col gap-lg border-e border-border bg-surface px-md py-lg lg:flex">
        <div className="flex items-center justify-between gap-sm">
          {logo}
          <NotificationBell align="start" />
        </div>
        {ctaButton}
        <div className="-mx-md flex-1 overflow-y-auto px-md">
          <NavList groups={groups} home={home} />
        </div>
        {footer}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-sm border-b border-border bg-surface/95 px-lg backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="relative -ms-sm grid size-10 place-items-center rounded-lg hover:bg-surface-soft"
          aria-label={menuLabel}
        >
          <Icon name="menu" />
          {totalBadges > 0 && (
            <span className="absolute end-1.5 top-1.5 size-2 rounded-full bg-red-500" />
          )}
        </button>
        <span className="truncate font-display text-sm font-semibold">
          {current?.label ?? brand}
        </span>
        <NotificationBell />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
            aria-label="close"
          />
          <div className="absolute inset-y-0 start-0 flex w-[82%] max-w-xs flex-col gap-lg bg-surface px-md py-lg shadow-2xl">
            <div className="flex items-center justify-between">
              {logo}
              <button
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-lg hover:bg-surface-soft"
                aria-label="close"
              >
                <Icon name="close" />
              </button>
            </div>
            {ctaButton}
            <div className="-mx-md flex-1 overflow-y-auto px-md">
              <NavList groups={groups} home={home} onNavigate={() => setOpen(false)} />
            </div>
            {footer}
          </div>
        </div>
      )}

      <main className="lg:ps-64">
        <div className="mx-auto flex max-w-6xl flex-col gap-xl px-lg py-lg sm:py-xl lg:px-2xl">
          {children}
        </div>
      </main>
    </div>
  );
}
