import { nowMs } from "@/lib/time";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { date, money } from "@/lib/i18n/format";
import {
  getOwnerListings,
  getOwnerProfile,
  getPlatformSetting,
} from "@/lib/queries/owner-dashboard";
import {
  ClaimFounderFeatured,
  FeaturedCheckout,
  SubscriptionCheckout,
  type InstapayInfo,
} from "@/components/subscription-checkout";
import { DocumentViewButton } from "@/components/document-view-button";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-md rounded-2xl border border-border p-lg">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export default async function OwnerSubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].subscription;
  const nowIso = new Date().toISOString();

  const [
    profile,
    listings,
    freeUntil,
    graceDays,
    instapay,
    { data: subs },
    { data: payments },
    { data: slots },
    { data: guarantee },
    { data: discount },
    { data: featuredPrice },
  ] = await Promise.all([
    getOwnerProfile(user.id),
    getOwnerListings(user.id),
    getPlatformSetting<string>("free_until", "2027-04-01T00:00:00+02:00"),
    getPlatformSetting<number>("grace_days", 7),
    getPlatformSetting<InstapayInfo>("instapay", { handle: "—", account_name: "Safe Sahel" }),
    supabase
      .from("listing_subscriptions")
      .select("id, property_id, plan, starts_at, ends_at, status, guarantee_extended_at")
      .eq("owner_id", user.id)
      .eq("status", "active")
      .order("ends_at", { ascending: false }),
    supabase
      .from("subscription_payments")
      .select(
        "id, kind, plan, amount_egp, status, rejection_reason, created_at, featured_weeks, proof_path",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("featured_slots")
      .select("property_id, compound_id, ends_at, source")
      .gt("ends_at", nowIso),
    supabase.rpc("guarantee_status"),
    supabase.rpc("broker_discount_pct", { p_owner_id: user.id }),
    supabase
      .from("subscription_prices")
      .select("price_egp")
      .eq("plan", "featured_week")
      .eq("tier", "launch")
      .maybeSingle(),
  ]);

  const now = nowMs();
  const freeActive = now < new Date(freeUntil).getTime();
  const graceMs = graceDays * 86_400_000;
  const latestByProperty = new Map<string, { plan: string; ends_at: string }>();
  for (const s of subs ?? [])
    if (!latestByProperty.has(s.property_id)) latestByProperty.set(s.property_id, s);

  const coverage = listings.map((l) => {
    const s = latestByProperty.get(l.id);
    const end = s ? new Date(s.ends_at).getTime() : 0;
    const status =
      s && end > now
        ? "active"
        : s && end + graceMs > now
          ? "grace"
          : freeActive
            ? "free"
            : s
              ? "expired"
              : "none";
    return { listing: l, sub: s, status };
  });
  const statusText: Record<string, string> = {
    free: t.statusFree,
    active: t.statusActive,
    grace: t.statusGrace,
    expired: t.statusExpired,
    none: t.statusNone,
  };
  const statusStyle: Record<string, string> = {
    free: "bg-turquoise-light text-turquoise-dark",
    active: "bg-turquoise-light text-turquoise-dark",
    grace: "bg-butter-soft text-ink",
    expired: "bg-red-50 text-red-700",
    none: "bg-surface-soft text-ink-secondary",
  };

  const featuredUntil = new Map<string, string>();
  const takenByCompound = new Map<string, Set<string>>();
  for (const s of slots ?? []) {
    if (listings.some((l) => l.id === s.property_id)) featuredUntil.set(s.property_id, s.ends_at);
    if (s.compound_id) {
      const set = takenByCompound.get(s.compound_id) ?? new Set();
      set.add(s.property_id);
      takenByCompound.set(s.compound_id, set);
    }
  }
  const slotsFree: Record<string, number> = {};
  for (const l of listings)
    if (l.compoundId)
      slotsFree[l.compoundId] = Math.max(0, 3 - (takenByCompound.get(l.compoundId)?.size ?? 0));

  const liveListings = listings.filter((l) => l.status === "published");
  const lite = listings.map((l) => ({
    id: l.id,
    title: l.title,
    monthlyRental: l.monthlyRental,
    compoundId: l.compoundId,
  }));
  const titleById = new Map(listings.map((l) => [l.id, l.title]));
  const hasFounderSlot = (slots ?? []).some(
    (s) => s.source === "founder_free" && titleById.has(s.property_id),
  );

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>

      {freeActive && (
        <div className="rounded-2xl bg-gradient-to-r from-turquoise to-turquoise-dark px-lg py-md font-medium text-white">
          🎁 {t.freeBanner(date(locale, freeUntil))}
        </div>
      )}
      <div className="flex flex-col gap-xs rounded-2xl border border-border px-lg py-md text-sm">
        <p className={profile.founding ? "font-semibold text-ink" : "text-ink-secondary"}>
          {profile.founding ? `⭐ ${t.founderYes}` : t.founderNo}
        </p>
        {profile.hostType === "broker" && (
          <p className="text-ink-secondary">
            {(discount ?? 0) > 0
              ? t.brokerDiscount(discount ?? 0, listings.length)
              : t.brokerDiscountNone(listings.length)}
          </p>
        )}
      </div>

      <Section title={t.currentTitle}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-start text-ink-secondary">
              <tr>
                <th className="pb-sm text-start font-medium">{t.listing}</th>
                <th className="pb-sm text-start font-medium">{t.plan}</th>
                <th className="pb-sm text-start font-medium">{t.ends}</th>
                <th className="pb-sm text-start font-medium">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map(({ listing, sub, status }) => (
                <tr key={listing.id} className="border-t border-border">
                  <td className="py-sm font-medium">
                    {listing.title}
                    {featuredUntil.has(listing.id) && (
                      <span className="block text-xs font-normal text-turquoise-dark">
                        ⭐ {t.featuredActive(date(locale, featuredUntil.get(listing.id)))}
                      </span>
                    )}
                  </td>
                  <td className="py-sm">{sub ? (t.plans[sub.plan]?.name ?? sub.plan) : "—"}</td>
                  <td className="py-sm">
                    {sub ? date(locale, sub.ends_at) : freeActive ? date(locale, freeUntil) : "—"}
                  </td>
                  <td className="py-sm">
                    <span
                      className={`rounded-full px-sm py-0.5 text-xs font-medium ${statusStyle[status]}`}
                    >
                      {statusText[status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {listings.length > 0 && (
        <Section title={t.buyTitle}>
          <SubscriptionCheckout ownerId={user.id} listings={lite} instapay={instapay} />
        </Section>
      )}

      <Section title={t.guaranteeTitle}>
        <p className="rounded-lg bg-butter-soft px-md py-sm text-sm font-medium text-ink">
          🛡️ {t.guaranteeBody}
        </p>
        {(guarantee ?? []).length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.noSeason}</p>
        ) : (
          <ul className="flex flex-col gap-xs text-sm">
            {(guarantee ?? []).map((g) => (
              <li key={g.subscription_id} className="rounded-lg border border-border px-md py-sm">
                <span className="font-medium">{titleById.get(g.property_id) ?? "—"}: </span>
                {g.status === "tracking"
                  ? t.guaranteeStatus.tracking(g.requests_in_window, date(locale, g.window_ends_at))
                  : g.status === "eligible"
                    ? t.guaranteeStatus.eligible
                    : g.status === "granted"
                      ? t.guaranteeStatus.granted
                      : t.guaranteeStatus.not_eligible(g.requests_in_window)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={t.featuredTitle}>
        <p className="text-sm text-ink-secondary">
          {t.featuredBody(money(locale, featuredPrice?.price_egp ?? 300))}
        </p>
        {profile.founding && !hasFounderSlot && liveListings.length > 0 && (
          <ClaimFounderFeatured
            listings={liveListings.map((l) => ({
              id: l.id,
              title: l.title,
              monthlyRental: l.monthlyRental,
              compoundId: l.compoundId,
            }))}
          />
        )}
        {profile.founding && hasFounderSlot && (
          <p className="text-sm text-turquoise-dark">{t.claimed}</p>
        )}
        <FeaturedCheckout
          ownerId={user.id}
          listings={lite}
          instapay={instapay}
          pricePerWeek={featuredPrice?.price_egp ?? 300}
          slotsFreeByCompound={slotsFree}
        />
      </Section>

      <Section title={t.historyTitle}>
        {(payments ?? []).length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.noHistory}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border text-sm">
            {(payments ?? []).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-sm py-sm">
                <span>
                  {date(locale, p.created_at)} ·{" "}
                  {p.kind === "featured"
                    ? t.kindFeatured(p.featured_weeks ?? 1)
                    : (t.plans[p.plan ?? ""]?.name ?? p.plan)}{" "}
                  · <span className="font-medium">{money(locale, p.amount_egp)}</span>
                  {p.status === "rejected" && p.rejection_reason && (
                    <span className="block text-xs text-red-700">{p.rejection_reason}</span>
                  )}
                </span>
                <span className="flex items-center gap-sm">
                  {p.proof_path && (
                    <DocumentViewButton
                      kind="payment_proof"
                      id={p.id}
                      label="📎"
                      className="text-sm"
                    />
                  )}
                  <span className="text-xs font-medium">{t.paymentStatus[p.status]}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
