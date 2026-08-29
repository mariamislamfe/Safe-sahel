"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminSettingsForm({
  depositPercentage,
  subscriptionPriceEgp,
}: {
  depositPercentage: number;
  subscriptionPriceEgp: number;
}) {
  const [deposit, setDeposit] = useState(depositPercentage);
  const [subscription, setSubscription] = useState(subscriptionPriceEgp);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await Promise.all([
      supabase.from("platform_settings").update({ value: deposit }).eq("key", "deposit_percentage"),
      supabase
        .from("platform_settings")
        .update({ value: subscription })
        .eq("key", "owner_subscription_price_egp"),
    ]);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="flex max-w-sm flex-col gap-md">
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">Security deposit (% of stay)</span>
        <input
          type="number"
          min={0}
          max={100}
          value={deposit}
          onChange={(e) => setDeposit(Number(e.target.value))}
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">
          Owner subscription price (EGP / property / month)
        </span>
        <input
          type="number"
          min={0}
          value={subscription}
          onChange={(e) => setSubscription(Number(e.target.value))}
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>
      <button
        onClick={save}
        disabled={saving}
        className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
      {saved && <p className="text-sm text-turquoise-dark">Saved.</p>}
    </div>
  );
}
