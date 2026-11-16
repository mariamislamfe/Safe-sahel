"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import type { QuoteLine, SubscriptionPlanEnum } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/client";
import { checkFile, uploadPrivate } from "@/lib/upload";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { common, errorText } from "@/lib/i18n/common";
import { money } from "@/lib/i18n/format";

export type InstapayInfo = { handle: string; account_name: string; phone?: string };
type Listing = { id: string; title: string; monthlyRental: boolean; compoundId: string | null };

const PLANS: SubscriptionPlanEnum[] = ["monthly", "season", "annual", "student_winter"];

/** InstaPay instructions + reference + screenshot → submit_payment(). */
function PaymentProof({
  ownerId,
  total,
  instapay,
  disabled,
  onSubmit,
}: {
  ownerId: string;
  total: number;
  instapay: InstapayInfo;
  disabled: boolean;
  onSubmit: (reference: string, proofPath: string | null) => Promise<string | null>;
}) {
  const locale = useLocale();
  const t = ownerDict[locale].subscription;
  const c = common[locale];
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reference.trim()) return setError(c.errors.missing_reference!);
    let proofPath: string | null = null;
    setBusy(true);
    if (file) {
      const check = checkFile(file);
      if (check !== "ok") {
        setBusy(false);
        return setError(check === "too_large" ? c.fileTooLarge : c.fileTypeNotAllowed);
      }
      const up = await uploadPrivate("payment-proofs", [ownerId], file);
      if (up.error) {
        setBusy(false);
        return setError(errorText(locale, rpcErrorCode(up.error.message)));
      }
      proofPath = up.path;
    }
    const err = await onSubmit(reference.trim(), proofPath);
    setBusy(false);
    if (err) return setError(err);
    setDone(true);
    setReference("");
    setFile(null);
  }

  if (done)
    return (
      <p className="rounded-lg bg-turquoise-light px-md py-sm text-sm font-medium text-turquoise-dark">
        ✓ {t.submitted}
      </p>
    );

  return (
    <form onSubmit={submit} className="flex flex-col gap-sm">
      <div className="rounded-xl border border-turquoise/30 bg-turquoise-light/50 p-md text-sm">
        <p className="text-ink-secondary">{t.payTo}</p>
        <p className="font-mono text-base font-bold text-ink" dir="ltr">
          {instapay.handle}
          {instapay.phone ? ` · ${instapay.phone}` : ""}
        </p>
        <p className="text-ink-secondary">
          {t.accountName}: <span className="font-medium text-ink">{instapay.account_name}</span>
        </p>
        <p className="mt-xs font-display text-lg font-bold text-ink">
          {t.total}: {money(locale, total)}
        </p>
      </div>
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.reference}</span>
        <input
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          dir="ltr"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.proof}</span>
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-ink-secondary"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy || disabled}
        className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {busy ? c.submitting : t.submit}
      </button>
    </form>
  );
}

export function SubscriptionCheckout({
  ownerId,
  listings,
  instapay,
}: {
  ownerId: string;
  listings: Listing[];
  instapay: InstapayInfo;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].subscription;
  const [selected, setSelected] = useState<string[]>(listings.map((l) => l.id));
  const [plan, setPlan] = useState<SubscriptionPlanEnum>("season");
  const [quote, setQuote] = useState<QuoteLine[]>([]);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (selected.length === 0) {
        setQuote([]);
        return;
      }
      const { data, error } = await createClient().rpc("quote_subscription", {
        p_property_ids: selected,
        p_plan: plan,
      });
      if (cancelled) return;
      setQuoteError(error ? errorText(locale, rpcErrorCode(error.message)) : null);
      setQuote(data ?? []);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [selected, plan, locale]);

  const total = quote.reduce((s, q) => s + q.amount, 0);
  const studentBlocked =
    plan === "student_winter" && listings.some((l) => selected.includes(l.id) && !l.monthlyRental);

  async function submit(reference: string, proofPath: string | null) {
    const { error } = await createClient().rpc("submit_payment", {
      p_kind: "subscription",
      p_plan: plan,
      p_property_ids: selected,
      p_weeks: null,
      p_reference: reference,
      p_proof_path: proofPath,
    });
    if (error) return errorText(locale, rpcErrorCode(error.message));
    router.refresh();
    return null;
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-sm">
        <p className="text-sm font-semibold">{t.chooseListings}</p>
        <div className="flex flex-wrap gap-sm">
          {listings.map((l) => (
            <label
              key={l.id}
              className={`flex cursor-pointer items-center gap-xs rounded-full border px-md py-xs text-sm ${selected.includes(l.id) ? "border-turquoise bg-turquoise-light text-turquoise-dark" : "border-border text-ink-secondary"}`}
            >
              <input
                type="checkbox"
                className="accent-turquoise"
                checked={selected.includes(l.id)}
                onChange={(e) =>
                  setSelected((prev) =>
                    e.target.checked ? [...prev, l.id] : prev.filter((x) => x !== l.id),
                  )
                }
              />
              {l.title}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-sm">
        <p className="text-sm font-semibold">{t.choosePlan}</p>
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          {PLANS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlan(p)}
              className={`flex flex-col items-start gap-0.5 rounded-xl border p-md text-start ${plan === p ? "border-turquoise bg-turquoise-light" : "border-border hover:border-turquoise"}`}
            >
              <span className="font-display font-semibold">{t.plans[p]!.name}</span>
              <span className="text-xs text-ink-secondary">{t.plans[p]!.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-sm">
        <p className="text-sm font-semibold">{t.quote}</p>
        {quoteError && <p className="text-sm text-red-600">{quoteError}</p>}
        {studentBlocked && (
          <p className="text-sm text-red-600">
            {common[locale].errors.student_plan_requires_monthly_rental}
          </p>
        )}
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border text-sm">
          {quote.map((q) => (
            <li
              key={q.property_id}
              className="flex flex-wrap items-center justify-between gap-sm p-md"
            >
              <span className="min-w-0">
                <span className="font-medium">{q.title}</span>
                <span className="block text-xs text-ink-secondary">
                  {t.tier(t.tiers[q.tier] ?? q.tier)}
                  {q.founder_rate && ` · ${t.founderRate}`}
                  {q.discount_pct > 0 && ` · −${q.discount_pct}%`}
                </span>
              </span>
              <span className="text-end">
                {q.included_free ? (
                  <span className="text-xs font-medium text-turquoise-dark">{t.included}</span>
                ) : (
                  <>
                    {q.discount_pct > 0 && (
                      <span className="me-xs text-xs text-ink-secondary line-through">
                        {money(locale, q.list_price)}
                      </span>
                    )}
                    <span className="font-semibold">{money(locale, q.amount)}</span>
                  </>
                )}
              </span>
            </li>
          ))}
          <li className="flex justify-between p-md font-display font-bold">
            <span>{t.total}</span>
            <span>{money(locale, total)}</span>
          </li>
        </ul>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-sm">
          <p className="text-sm font-semibold">{t.payTitle}</p>
          <PaymentProof
            ownerId={ownerId}
            total={total}
            instapay={instapay}
            disabled={selected.length === 0 || studentBlocked}
            onSubmit={submit}
          />
        </div>
      )}
    </div>
  );
}

export function FeaturedCheckout({
  ownerId,
  listings,
  instapay,
  pricePerWeek,
  slotsFreeByCompound,
}: {
  ownerId: string;
  listings: Listing[];
  instapay: InstapayInfo;
  pricePerWeek: number;
  slotsFreeByCompound: Record<string, number>;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].subscription;
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [weeks, setWeeks] = useState(1);
  const listing = listings.find((l) => l.id === listingId);
  const free = listing?.compoundId ? (slotsFreeByCompound[listing.compoundId] ?? 3) : 3;

  async function submit(reference: string, proofPath: string | null) {
    const { error } = await createClient().rpc("submit_payment", {
      p_kind: "featured",
      p_plan: null,
      p_property_ids: [listingId],
      p_weeks: weeks,
      p_reference: reference,
      p_proof_path: proofPath,
    });
    if (error) return errorText(locale, rpcErrorCode(error.message));
    router.refresh();
    return null;
  }

  if (listings.length === 0) return null;
  return (
    <div className="flex flex-col gap-md">
      <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
        <select
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-sm text-sm">
          {t.weeks}
          <input
            type="number"
            min={1}
            max={12}
            value={weeks}
            onChange={(e) => setWeeks(Math.min(12, Math.max(1, Number(e.target.value))))}
            className="w-20 rounded-sm border border-border bg-surface px-sm py-xs"
          />
        </label>
      </div>
      <p className={`text-xs ${free === 0 ? "font-medium text-red-600" : "text-ink-secondary"}`}>
        {t.slotsLeft(free)}
      </p>
      <PaymentProof
        ownerId={ownerId}
        total={pricePerWeek * weeks}
        instapay={instapay}
        disabled={free === 0}
        onSubmit={submit}
      />
    </div>
  );
}

export function ClaimFounderFeatured({ listings }: { listings: Listing[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].subscription;
  const [listingId, setListingId] = useState(listings[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (listings.length === 0) return null;

  async function claim() {
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().rpc("claim_founder_featured", {
      p_property_id: listingId,
    });
    setBusy(false);
    if (e) return setError(errorText(locale, rpcErrorCode(e.message)));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-sm rounded-xl bg-ink p-md text-white">
      <div className="flex flex-wrap items-center gap-sm">
        <select
          value={listingId}
          onChange={(e) => setListingId(e.target.value)}
          className="rounded-sm bg-white/10 px-sm py-xs text-sm"
        >
          {listings.map((l) => (
            <option key={l.id} value={l.id} className="text-ink">
              {l.title}
            </option>
          ))}
        </select>
        <button
          onClick={claim}
          disabled={busy}
          className="rounded-md bg-butter px-md py-xs text-sm font-semibold text-ink disabled:opacity-60"
        >
          ⭐ {t.claimFounder}
        </button>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
