"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

const tabs = [
  { href: "/owner", label: "Properties" },
  { href: "/owner/bookings", label: "Bookings" },
];

export function OwnerShell({ children }: { children: React.ReactNode }) {
  const { profile, loading, refetch } = useCurrentProfile();
  const pathname = usePathname();
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return null;

  const isHost = profile?.role === "owner" || profile?.role === "admin";

  if (profile && !isHost) {
    return (
      <main className="mx-auto flex max-w-sm flex-col items-center gap-md px-lg py-4xl text-center">
        <h1 className="font-display text-2xl font-bold">Become a host</h1>
        <p className="text-ink-secondary">
          List your chalet or villa on Safe Sahel. You can still browse and book as a guest too.
        </p>
        <button
          disabled={enabling}
          onClick={async () => {
            setEnabling(true);
            setError(null);
            const supabase = createClient();
            const { error: updateError } = await supabase
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
          {enabling ? "Enabling…" : "Enable hosting"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </main>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-xl px-lg py-2xl">
      <nav className="flex gap-lg border-b border-border">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`border-b-2 px-xs pb-md text-sm font-medium ${
              pathname === tab.href
                ? "border-turquoise text-ink"
                : "border-transparent text-ink-secondary hover:text-ink"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
