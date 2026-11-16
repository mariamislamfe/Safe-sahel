"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PriceTierEnum } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";

type Price = { plan: string; tier: PriceTierEnum; price_egp: number };
const TIERS: PriceTierEnum[] = ["launch", "basic", "premium", "luxury"];
const PLANS = ["monthly", "season", "annual", "student_winter", "featured_week"] as const;

export function AdminPricesForm({ prices }: { prices: Price[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = adminDict[locale].settings;
  const o = ownerDict[locale].subscription;
  const c = common[locale];
  const [values, setValues] = useState(
    () => new Map(prices.map((p) => [`${p.plan}:${p.tier}`, p.price_egp])),
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const rows = [...values.entries()].map(([k, v]) => {
      const [plan, tier] = k.split(":") as [Price["plan"], PriceTierEnum];
      return { plan: plan as "monthly", tier, price_egp: Math.max(0, Math.round(v)) };
    });
    const { error: e } = await createClient()
      .from("subscription_prices")
      .upsert(rows, { onConflict: "plan,tier" });
    setSaving(false);
    if (e) return setError(e.message);
    setSaved(true);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-sm">
      <p className="text-xs text-ink-secondary">{t.pricesHint}</p>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-surface-soft text-ink-secondary">
            <tr>
              <th className="p-sm text-start font-medium">{t.plan}</th>
              {TIERS.map((tier) => (
                <th key={tier} className="p-sm text-end font-medium">
                  {o.tiers[tier]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANS.map((plan) => (
              <tr key={plan} className="border-t border-border">
                <td className="p-sm font-medium">
                  {plan === "featured_week" ? o.featuredTitle : o.plans[plan]?.name}
                </td>
                {TIERS.map((tier) => (
                  <td key={tier} className="p-sm text-end">
                    <input
                      type="number"
                      min={0}
                      value={values.get(`${plan}:${tier}`) ?? 0}
                      onChange={(e) =>
                        setValues(new Map(values).set(`${plan}:${tier}`, Number(e.target.value)))
                      }
                      className="w-24 rounded-sm border border-border bg-surface px-xs py-0.5 text-end tabular-nums"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={save}
        disabled={saving}
        className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? c.saving : c.save}
      </button>
      {saved && <p className="text-sm text-turquoise-dark">{t.saved}</p>}
    </div>
  );
}

type Settings = Record<string, unknown>;

export function AdminRulesForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const locale = useLocale();
  const t = adminDict[locale].settings;
  const c = common[locale];
  const instapay = (settings.instapay ?? {}) as {
    handle?: string;
    account_name?: string;
    phone?: string;
  };
  const [form, setForm] = useState({
    instapayHandle: instapay.handle ?? "",
    instapayName: instapay.account_name ?? "",
    freeUntil: String(settings.free_until ?? "").slice(0, 10),
    foundingCutoff: String(settings.founding_cutoff ?? "").slice(0, 10),
    graceDays: Number(settings.grace_days ?? 7),
    expiryHours: Number(settings.booking_expiry_hours ?? 24),
    strikeThreshold: Number(settings.strike_flag_threshold ?? 2),
    retention: Number(settings.guest_id_retention_days ?? 30),
    maxFeatured: Number(settings.featured_max_per_compound ?? 3),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setSaved(false);
    setError(null);
    const cairo = (d: string) => `${d}T00:00:00+02:00`;
    const rows = [
      {
        key: "instapay",
        value: { ...instapay, handle: form.instapayHandle, account_name: form.instapayName },
      },
      { key: "free_until", value: cairo(form.freeUntil) },
      { key: "founding_cutoff", value: cairo(form.foundingCutoff) },
      { key: "grace_days", value: form.graceDays },
      { key: "booking_expiry_hours", value: form.expiryHours },
      { key: "strike_flag_threshold", value: form.strikeThreshold },
      { key: "guest_id_retention_days", value: form.retention },
      { key: "featured_max_per_compound", value: form.maxFeatured },
    ];
    const { error: e } = await createClient()
      .from("platform_settings")
      .upsert(rows, { onConflict: "key" });
    setSaving(false);
    if (e) return setError(e.message);
    setSaved(true);
    router.refresh();
  }

  const field = (label: string, key: keyof typeof form, type: "text" | "date" | "number") => (
    <label className="flex flex-col gap-xs text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={form[key]}
        onChange={(e) =>
          setForm({ ...form, [key]: type === "number" ? Number(e.target.value) : e.target.value })
        }
        className="rounded-sm border border-border bg-surface px-md py-sm"
      />
    </label>
  );

  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        {field(t.instapayHandle, "instapayHandle", "text")}
        {field(t.instapayName, "instapayName", "text")}
        {field(t.freeUntil, "freeUntil", "date")}
        {field(t.foundingCutoff, "foundingCutoff", "date")}
        {field(t.graceDays, "graceDays", "number")}
        {field(t.expiryHours, "expiryHours", "number")}
        {field(t.strikeThreshold, "strikeThreshold", "number")}
        {field(t.retention, "retention", "number")}
        {field(t.maxFeatured, "maxFeatured", "number")}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        onClick={save}
        disabled={saving}
        className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-medium text-white disabled:opacity-60"
      >
        {saving ? c.saving : c.save}
      </button>
      {saved && <p className="text-sm text-turquoise-dark">{t.saved}</p>}
    </div>
  );
}
