"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";

export function OwnerShell({
  children,
  pendingCount = 0,
}: {
  children: React.ReactNode;
  pendingCount?: number;
}) {
  const { profile, loading, refetch } = useCurrentProfile();
  const pathname = usePathname();
  const locale = useLocale();
  const t = ownerDict[locale];
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  const isHost = profile?.role === "owner" || profile?.role === "admin";

  if (profile && !isHost) {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center gap-md px-lg py-4xl text-center">
        <h1 className="font-display text-2xl font-bold">{t.becomeHost.title}</h1>
        <p className="text-ink-secondary">{t.becomeHost.body}</p>
        <button
          disabled={enabling}
          onClick={async () => {
            setEnabling(true);
            setError(null);
            const { error: updateError } = await createClient()
              .from("profiles")
              .update({ role: "owner" })
              .eq("id", profile.id);
            if (updateError) {
              setError(updateError.message);
              setEnabling(false);
              return;
            }
            await refetch();
            setEnabling(false);
          }}
          className="rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {enabling ? t.becomeHost.enabling : t.becomeHost.button}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  const tabs = [
    { href: "/owner", label: t.nav.overview, exact: true },
    { href: "/owner/bookings", label: t.nav.bookings, badge: pendingCount },
    { href: "/owner/calendar", label: t.nav.calendar },
    { href: "/owner/listings", label: t.nav.listings, also: "/owner/properties" },
    { href: "/owner/verification", label: t.nav.verification },
    { href: "/owner/subscription", label: t.nav.subscription },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-xl px-lg py-xl sm:py-2xl">
      <nav className="-mx-lg flex gap-lg overflow-x-auto border-b border-border px-lg [scrollbar-width:none]">
        {tabs.map((tab) => {
          const active = tab.exact
            ? pathname === tab.href
            : pathname?.startsWith(tab.href) || (tab.also && pathname?.startsWith(tab.also));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex shrink-0 items-center gap-xs border-b-2 px-xs pb-md text-sm font-medium ${
                active
                  ? "border-turquoise text-ink"
                  : "border-transparent text-ink-secondary hover:text-ink"
              }`}
            >
              {tab.label}
              {!!tab.badge && (
                <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
