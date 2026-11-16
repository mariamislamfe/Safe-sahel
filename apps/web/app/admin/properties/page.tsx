import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { blockerTexts, common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { profileMap, propertyMap } from "@/lib/queries/admin";
import {
  DuplicateFlagActions,
  ListingAdminActions,
  RevokeStrike,
} from "@/components/admin-actions";

const FILTERS = ["all", "live", "hidden", "flagged", "duplicates"] as const;

export default async function AdminPropertiesPage(props: PageProps<"/admin/properties">) {
  const params = await props.searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(params.f))
    ? String(params.f)
    : "all";
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].listings;
  const c = common[locale];

  const [
    { data: properties },
    { data: images },
    { data: strikes },
    { data: dupFlags },
    { data: compounds },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, title, slug, status, owner_id, compound_id, price_per_night, unpublished_reason, flagged_for_review, flag_reason, created_at",
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("property_images").select("property_id"),
    supabase
      .from("owner_strikes")
      .select("id, owner_id, booking_id, reason, created_at, revoked_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("listing_duplicate_flags")
      .select("*")
      .eq("status", "open")
      .order("score", { ascending: false }),
    supabase.from("compounds").select("id, name"),
  ]);

  const owners = await profileMap(
    (properties ?? []).map((p) => p.owner_id).concat((strikes ?? []).map((s) => s.owner_id)),
  );
  const dupProps = await propertyMap(
    (dupFlags ?? []).flatMap((d) => [d.property_id, d.other_property_id]),
  );
  const compoundName = new Map((compounds ?? []).map((co) => [co.id, co.name]));
  const photoCount = new Map<string, number>();
  for (const i of images ?? [])
    photoCount.set(i.property_id, (photoCount.get(i.property_id) ?? 0) + 1);
  const activeStrikes = new Map<string, number>();
  for (const s of strikes ?? [])
    if (!s.revoked_at) activeStrikes.set(s.owner_id, (activeStrikes.get(s.owner_id) ?? 0) + 1);
  const dupIds = new Set((dupFlags ?? []).flatMap((d) => [d.property_id, d.other_property_id]));

  const rows = (properties ?? []).filter((p) =>
    filter === "live"
      ? p.status === "published"
      : filter === "hidden"
        ? p.status !== "published"
        : filter === "flagged"
          ? p.flagged_for_review
          : filter === "duplicates"
            ? dupIds.has(p.id)
            : true,
  );

  return (
    <div className="flex flex-col gap-2xl">
      <div className="flex flex-col gap-md">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <div className="flex flex-wrap gap-xs">
          {FILTERS.map((f) => (
            <Link
              key={f}
              href={`/admin/properties?f=${f}`}
              className={`rounded-full border px-md py-xs text-sm ${filter === f ? "border-ink bg-ink text-white" : "border-border"}`}
            >
              {t.filters[f]}
            </Link>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="bg-surface-soft text-ink-secondary">
              <tr>
                <th className="p-md text-start font-medium">{t.listing}</th>
                <th className="p-md text-start font-medium">{t.owner}</th>
                <th className="p-md text-start font-medium">{t.status}</th>
                <th className="p-md text-start font-medium">{t.photos}</th>
                <th className="p-md text-start font-medium">{t.flags}</th>
                <th className="p-md text-start font-medium">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const owner = owners.get(p.owner_id);
                const strikesN = activeStrikes.get(p.owner_id) ?? 0;
                return (
                  <tr key={p.id} className="border-t border-border align-top">
                    <td className="p-md">
                      <Link
                        href={`/properties/${p.slug}`}
                        className="font-medium hover:text-turquoise-dark"
                      >
                        {p.title}
                      </Link>
                      <p className="text-xs text-ink-secondary">
                        {p.compound_id ? compoundName.get(p.compound_id) : "—"} ·{" "}
                        {money(locale, Number(p.price_per_night))}
                      </p>
                    </td>
                    <td className="p-md">
                      {owner?.name ?? "—"}
                      <p className="text-xs">
                        {owner?.verified ? (
                          <span className="text-turquoise-dark">
                            ✓{" "}
                            {owner.hostType === "broker"
                              ? c.badges.approvedBroker
                              : c.badges.verifiedOwner}
                          </span>
                        ) : (
                          <span className="text-ink-secondary">✗</span>
                        )}
                      </p>
                    </td>
                    <td className="p-md">
                      <span className="text-xs font-medium">{c.propertyStatus[p.status]}</span>
                      {p.unpublished_reason && (
                        <p className="max-w-[200px] text-xs text-ink-secondary">
                          {blockerTexts(locale, p.unpublished_reason).join(" · ")}
                        </p>
                      )}
                    </td>
                    <td
                      className={`p-md tabular-nums ${(photoCount.get(p.id) ?? 0) < 5 ? "text-red-600" : ""}`}
                    >
                      {photoCount.get(p.id) ?? 0}
                    </td>
                    <td className="p-md text-xs">
                      {p.flagged_for_review && (
                        <span className="block font-semibold text-red-700">
                          🚩 {blockerTexts(locale, p.flag_reason ?? "")}
                        </span>
                      )}
                      {strikesN > 0 && (
                        <span className="block text-red-700">
                          ⚠️ {t.strikes}: {strikesN}
                        </span>
                      )}
                      {dupIds.has(p.id) && (
                        <span className="block text-orange-700">⧉ {t.filters.duplicates}</span>
                      )}
                    </td>
                    <td className="p-md">
                      <ListingAdminActions
                        propertyId={p.id}
                        ownerId={p.owner_id}
                        status={p.status}
                        flagged={p.flagged_for_review}
                        ownerVerified={owner?.verified ?? false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.duplicatesTitle}</h2>
        {(dupFlags ?? []).length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.noDuplicates}</p>
        ) : (
          (dupFlags ?? []).map((d) => {
            const a = dupProps.get(d.property_id);
            const b = dupProps.get(d.other_property_id);
            return (
              <div
                key={d.id}
                className="flex flex-col gap-sm rounded-2xl border border-orange-200 bg-orange-50/40 p-md sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-medium">
                    {a?.title ?? "—"}{" "}
                    <span className="text-ink-secondary">
                      ({owners.get(a?.ownerId ?? "")?.name ?? "—"})
                    </span>{" "}
                    ⇄ {b?.title ?? "—"}{" "}
                    <span className="text-ink-secondary">
                      ({owners.get(b?.ownerId ?? "")?.name ?? "—"})
                    </span>
                  </p>
                  <p className="text-xs text-ink-secondary">
                    {d.reasons.map((r) => t.reasons[r] ?? r).join(" · ")} · score{" "}
                    {Number(d.score).toFixed(2)}
                  </p>
                </div>
                <DuplicateFlagActions id={d.id} />
              </div>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.strikesTitle}</h2>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {(strikes ?? []).map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-sm py-xs">
              <span className={s.revoked_at ? "text-ink-secondary line-through" : ""}>
                {owners.get(s.owner_id)?.name ?? "—"} · {s.reason} · {date(locale, s.created_at)}
              </span>
              {!s.revoked_at && <RevokeStrike id={s.id} />}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
