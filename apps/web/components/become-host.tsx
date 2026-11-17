"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { Icon } from "@/components/admin/icons";

/** Shown on /owner to signed-in guests: one tap turns hosting on. */
export function BecomeHost({ profileId }: { profileId: string }) {
  const locale = useLocale();
  const t = ownerDict[locale].becomeHost;
  const d = dashboardDict[locale].host;
  const router = useRouter();
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enable() {
    setEnabling(true);
    setError(null);
    const { error: updateError } = await createClient()
      .from("profiles")
      .update({ role: "owner" })
      .eq("id", profileId);
    if (updateError) {
      setError(updateError.message);
      setEnabling(false);
      return;
    }
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#F7F8FA] px-lg py-2xl">
      <div className="flex w-full max-w-md flex-col items-center gap-md rounded-3xl border border-border bg-surface p-xl text-center shadow-sm">
        <span className="grid size-14 place-items-center rounded-2xl bg-turquoise-light text-turquoise-dark">
          <Icon name="home" className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-ink-secondary">{t.body}</p>
        <button
          disabled={enabling}
          onClick={enable}
          className="w-full rounded-xl bg-turquoise px-xl py-md font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {enabling ? t.enabling : t.button}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Link href="/" className="text-sm font-medium text-ink-secondary hover:text-ink">
          {d.viewSite}
        </Link>
      </div>
    </main>
  );
}
