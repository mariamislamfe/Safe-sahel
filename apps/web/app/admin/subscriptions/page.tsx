import { nowMs } from "@/lib/time";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { date, money } from "@/lib/i18n/format";
import { compoundList, profileMap, propertyMap } from "@/lib/queries/admin";
import { getPlatformSetting } from "@/lib/queries/owner-dashboard";

const FILTERS = ["all", "active", "expiring", "grace", "expired"] as const;

export default async function AdminSubscriptionsPage(props: PageProps<"/admin/subscriptions">) {
  const params = await props.searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(params.f))
    ? String(params.f)
    : "all";
  const compoundId = typeof params.c === "string" ? params.c : "";

  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].subscriptions;
  const plans = ownerDict[locale].subscription.plans;

  const [{ data: subs }, compounds, graceDays, freeUntil] = await Promise.all([
    supabase.from("listing_subscriptions").select("*").eq("status", "active").order("ends_at"),
    compoundList(),
    getPlatformSetting<number>("grace_days", 7),
    getPlatformSetting<string>("free_until", "2027-04-01T00:00:00+02:00"),
  ]);
  const [props_, owners] = await Promise.all([
    propertyMap((subs ?? []).map((s) => s.property_id)),
    profileMap((subs ?? []).map((s) => s.owner_id)),
  ]);

  const now = nowMs();
  const grace = graceDays * 86_400_000;
  // Only the latest plan per listing decides its state.
  const latest = new Map<string, NonNullable<typeof subs>[number]>();
  for (const s of subs ?? []) {
    const prev = latest.get(s.property_id);
    if (!prev || prev.ends_at < s.ends_at) latest.set(s.property_id, s);
  }
  const rows = [...latest.values()]
    .map((s) => {
      const end = new Date(s.ends_at).getTime();
      const state =
        end > now + 7 * 86_400_000
          ? "active"
          : end > now
            ? "expiring"
            : end + grace > now
              ? "grace"
              : "expired";
      return { s, state, property: props_.get(s.property_id) };
    })
    .filter((r) =>
      filter === "all"
        ? true
        : filter === "active"
          ? r.state === "active" || r.state === "expiring"
          : r.state === filter,
    )
    .filter((r) => !compoundId || r.property?.compoundId === compoundId);

  const style: Record<string, string> = {
    active: "bg-turquoise-light text-turquoise-dark",
    expiring: "bg-butter-soft text-ink",
    grace: "bg-orange-50 text-orange-700",
    expired: "bg-red-50 text-red-700",
  };
  const link = (f: string, c: string) => `/admin/subscriptions?f=${f}${c ? `&c=${c}` : ""}`;

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>
      {now < new Date(freeUntil).getTime() && (
        <p className="rounded-lg bg-turquoise-light px-md py-sm text-sm text-turquoise-dark">
          {t.freeNote(date(locale, freeUntil))}
        </p>
      )}
      <div className="flex flex-wrap gap-xs">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={link(f, compoundId)}
            className={`rounded-full border px-md py-xs text-sm ${filter === f ? "border-ink bg-ink text-white" : "border-border"}`}
          >
            {t.filters[f]}
          </Link>
        ))}
      </div>
      <div className="-mx-lg flex gap-xs overflow-x-auto px-lg">
        <Link
          href={link(filter, "")}
          className={`shrink-0 rounded-full border px-md py-xs text-xs ${!compoundId ? "border-turquoise bg-turquoise-light" : "border-border"}`}
        >
          {t.allCompounds}
        </Link>
        {compounds.map((c) => (
          <Link
            key={c.id}
            href={link(filter, c.id)}
            className={`shrink-0 rounded-full border px-md py-xs text-xs ${compoundId === c.id ? "border-turquoise bg-turquoise-light" : "border-border"}`}
          >
            {c.is_focus && "★ "}
            {locale === "ar" && c.name_ar ? c.name_ar : c.name}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-ink-secondary">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-soft text-ink-secondary">
              <tr>
                <th className="p-md text-start font-medium">{t.listing}</th>
                <th className="p-md text-start font-medium">{t.owner}</th>
                <th className="p-md text-start font-medium">{t.plan}</th>
                <th className="p-md text-start font-medium">{t.ends}</th>
                <th className="p-md text-start font-medium">{t.status}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ s, state, property }) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-md font-medium">{property?.title ?? "—"}</td>
                  <td className="p-md">{owners.get(s.owner_id)?.name ?? "—"}</td>
                  <td className="p-md">
                    {plans[s.plan]?.name ?? s.plan} · {money(locale, s.amount_egp)}
                    {s.is_founder_rate && " ⭐"}
                  </td>
                  <td className="p-md">{date(locale, s.ends_at)}</td>
                  <td className="p-md">
                    <span
                      className={`rounded-full px-sm py-0.5 text-xs font-medium ${style[state]}`}
                    >
                      {t.filters[state]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
