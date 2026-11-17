"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { isValidPhone, normalizePhone } from "@safe-sahel/validation";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { authDict } from "@/lib/i18n/auth";
import { Icon } from "@/components/admin/icons";

/**
 * Shown on /owner to signed-in guests: one tap turns hosting on. Hosts must
 * have a WhatsApp number, so it's asked for here when the account has none.
 */
export function BecomeHost({ profileId, phone }: { profileId: string; phone: string | null }) {
  const locale = useLocale();
  const t = ownerDict[locale].becomeHost;
  const d = dashboardDict[locale].host;
  const a = authDict[locale];
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsPhone = !phone;

  async function enable() {
    setError(null);
    if (needsPhone) {
      if (!number.trim()) return setError(a.errors.phone_required!);
      if (!isValidPhone(number)) return setError(a.errors.phone_invalid!);
    }
    setEnabling(true);
    const { error: updateError } = await createClient()
      .from("profiles")
      .update(needsPhone ? { role: "owner", phone: normalizePhone(number) } : { role: "owner" })
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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void enable();
        }}
        className="flex w-full max-w-md flex-col items-center gap-md rounded-3xl border border-border bg-surface p-xl text-center shadow-sm"
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-turquoise-light text-turquoise-dark">
          <Icon name="home" className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-ink-secondary">{t.body}</p>
        {needsPhone && (
          <label className="flex w-full flex-col gap-xs text-start">
            <span className="text-sm font-medium">{a.phone.label}</span>
            <input
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              placeholder={a.phone.placeholder}
              className="w-full rounded-xl border border-border bg-surface px-md py-2.5 text-start outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20"
            />
            <span className="text-xs text-ink-secondary">{a.phone.hostHint}</span>
          </label>
        )}
        <button
          type="submit"
          disabled={enabling}
          className="w-full rounded-xl bg-turquoise px-xl py-md font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {enabling ? t.enabling : t.button}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <p className="text-xs text-ink-secondary">
          <Link href="/terms" target="_blank" className="underline">
            {a.signup.terms}
          </Link>
        </p>
        <Link href="/" className="text-sm font-medium text-ink-secondary hover:text-ink">
          {d.viewSite}
        </Link>
      </form>
    </main>
  );
}
