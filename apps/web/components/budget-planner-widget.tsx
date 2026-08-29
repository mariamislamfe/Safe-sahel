"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Locale } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/client";
import { getDictionary } from "@/lib/i18n/dictionary";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { formatEgp } from "@safe-sahel/utils";

type BudgetMatch = {
  id: string;
  slug: string;
  title: string;
  compoundName: string | null;
  coverImageUrl: string | null;
  pricePerNight: number;
  nights: number;
  totalCost: number;
};

function WalletIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5A2.5 2.5 0 016.5 5h11A2.5 2.5 0 0120 7.5v9a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 014 16.5v-9z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M14.5 12.5a1.25 1.25 0 102.5 0 1.25 1.25 0 00-2.5 0z" fill="currentColor" />
      <path d="M4 9.5h13.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export function BudgetPlannerWidget({ locale }: { locale: Locale }) {
  const { profile } = useCurrentProfile();
  const t = getDictionary(locale).budgetPlanner;
  const [open, setOpen] = useState(false);
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BudgetMatch[] | null>(null);

  async function findMatches(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(budget);
    if (!amount || amount <= 0) return;
    setLoading(true);
    setResults(null);
    const supabase = createClient();

    const { data: properties } = await supabase
      .from("properties")
      .select("id, slug, title, compound_id, price_per_night")
      .eq("status", "published")
      .is("deleted_at", null)
      .lte("price_per_night", amount)
      .order("price_per_night", { ascending: false })
      .limit(20);

    if (!properties || properties.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    const compoundIds = [...new Set(properties.map((p) => p.compound_id).filter(Boolean))] as string[];
    const propertyIds = properties.map((p) => p.id);

    const [{ data: compounds }, { data: images }] = await Promise.all([
      compoundIds.length > 0
        ? supabase.from("compounds").select("id, name").in("id", compoundIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      supabase.from("property_images").select("property_id, url").in("property_id", propertyIds).eq("is_cover", true),
    ]);

    const compoundNameById = new Map((compounds ?? []).map((c) => [c.id, c.name]));
    const coverByPropertyId = new Map((images ?? []).map((img) => [img.property_id, img.url]));

    const matches = properties
      .map((p) => {
        const price = Number(p.price_per_night);
        const nights = Math.floor(amount / price);
        return {
          id: p.id,
          slug: p.slug,
          title: p.title,
          compoundName: p.compound_id ? (compoundNameById.get(p.compound_id) ?? null) : null,
          coverImageUrl: coverByPropertyId.get(p.id) ?? null,
          pricePerNight: price,
          nights,
          totalCost: nights * price,
        };
      })
      .sort((a, b) => b.nights - a.nights || b.pricePerNight - a.pricePerNight)
      .slice(0, 6);

    setResults(matches);
    setLoading(false);
  }

  const bottomOffsetClass = profile ? "bottom-[5.75rem]" : "bottom-lg";

  return (
    <div className={`fixed ${bottomOffsetClass} end-lg z-40 flex flex-col items-end gap-sm`}>
      {open && (
        <div className="flex max-h-[32rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:w-96">
          <div className="flex items-center gap-sm border-b border-border px-lg py-md">
            <p className="flex-1 truncate font-display text-sm font-semibold text-ink">{t.title}</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-lg leading-none text-ink-secondary hover:text-ink"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-md overflow-y-auto p-lg">
            {results === null && <p className="text-sm text-ink-secondary">{t.intro}</p>}

            <form onSubmit={findMatches} className="flex flex-col gap-sm">
              <label className="flex flex-col gap-xs">
                <span className="text-xs font-medium text-ink-secondary">{t.inputLabel}</span>
                <input
                  type="number"
                  min={1}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="5000"
                  className="rounded-md border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise"
                />
              </label>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
              >
                {loading ? t.loading : t.submit}
              </button>
            </form>

            {results !== null && (
              <>
                {results.length === 0 ? (
                  <div className="flex flex-col items-center gap-xs px-md py-lg text-center">
                    <p className="text-sm font-medium text-ink">{t.emptyTitle}</p>
                    <p className="text-xs text-ink-secondary">{t.emptyBody}</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-ink-secondary">{t.resultsIntro}</p>
                    <div className="flex flex-col gap-sm">
                      {results.map((m) => (
                        <Link
                          key={m.id}
                          href={`/properties/${m.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-sm rounded-xl border border-border p-sm hover:bg-surface-soft"
                        >
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-soft">
                            {m.coverImageUrl && (
                              <Image src={m.coverImageUrl} alt="" fill sizes="56px" className="object-cover" />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p className="truncate text-sm font-medium text-ink">{m.title}</p>
                            {m.compoundName && (
                              <p className="truncate text-xs text-ink-secondary">{m.compoundName}</p>
                            )}
                            <p className="text-xs text-turquoise-dark">
                              {t.nightsLabel(m.nights)} · {formatEgp(m.pricePerNight)} / night
                            </p>
                            <p className="text-xs text-ink-secondary">
                              {t.total}: {formatEgp(m.totalCost)}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 items-center gap-sm rounded-full bg-butter px-lg text-ink shadow-lg transition-colors hover:bg-butter/80"
      >
        <WalletIcon />
        <span className="text-sm font-semibold">{t.fabLabel}</span>
      </button>
    </div>
  );
}
