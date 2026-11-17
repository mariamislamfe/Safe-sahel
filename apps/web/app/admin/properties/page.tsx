import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { blockerTexts, common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { profileMap, propertyMap } from "@/lib/queries/admin";
import {
  DuplicateFlagActions,
  ListingAdminActions,
  RevokeStrike,
} from "@/components/admin-actions";
import {
  Card,
  EmptyState,
  FilterTabs,
  PageHeader,
  Pill,
  Section,
  Table,
  Td,
  Th,
  Tr,
  type PillTone,
} from "@/components/admin/ui";

const FILTERS = ["all", "live", "hidden", "flagged", "duplicates"] as const;
const STATUS_TONE: Record<string, PillTone> = {
  published: "success",
  draft: "neutral",
  suspended: "danger",
  archived: "neutral",
};

export default async function AdminPropertiesPage(props: PageProps<"/admin/properties">) {
  await requireSection("listings");
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
    supabase.from("compounds").select("id, name, name_ar"),
  ]);

  const owners = await profileMap(
    (properties ?? []).map((p) => p.owner_id).concat((strikes ?? []).map((s) => s.owner_id)),
  );
  const dupProps = await propertyMap(
    (dupFlags ?? []).flatMap((d) => [d.property_id, d.other_property_id]),
  );
  const compoundName = new Map(
    (compounds ?? []).map((co) => [co.id, locale === "ar" && co.name_ar ? co.name_ar : co.name]),
  );
  const photoCount = new Map<string, number>();
  for (const i of images ?? [])
    photoCount.set(i.property_id, (photoCount.get(i.property_id) ?? 0) + 1);
  const activeStrikes = new Map<string, number>();
  for (const s of strikes ?? [])
    if (!s.revoked_at) activeStrikes.set(s.owner_id, (activeStrikes.get(s.owner_id) ?? 0) + 1);
  const dupIds = new Set((dupFlags ?? []).flatMap((d) => [d.property_id, d.other_property_id]));

  const all = properties ?? [];
  const match = (f: string, p: (typeof all)[number]) =>
    f === "live"
      ? p.status === "published"
      : f === "hidden"
        ? p.status !== "published"
        : f === "flagged"
          ? p.flagged_for_review
          : f === "duplicates"
            ? dupIds.has(p.id)
            : true;
  const rows = all.filter((p) => match(filter, p));

  return (
    <>
      <PageHeader title={t.title} count={all.length} />
      <FilterTabs
        items={FILTERS.map((f) => ({
          href: `/admin/properties?f=${f}`,
          label: t.filters[f]!,
          active: filter === f,
          count: all.filter((p) => match(f, p)).length,
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState icon="building" title={c.noResults} />
      ) : (
        <Table minWidth={900}>
          <thead>
            <tr>
              <Th>{t.listing}</Th>
              <Th>{t.owner}</Th>
              <Th>{t.status}</Th>
              <Th end>{t.photos}</Th>
              <Th>{t.flags}</Th>
              <Th>{t.actions}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const owner = owners.get(p.owner_id);
              const strikesN = activeStrikes.get(p.owner_id) ?? 0;
              const photos = photoCount.get(p.id) ?? 0;
              return (
                <Tr key={p.id}>
                  <Td>
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
                  </Td>
                  <Td>
                    <span className="font-medium">{owner?.name ?? "—"}</span>
                    <p className="text-xs">
                      {owner?.verified ? (
                        <span className="text-turquoise-dark">
                          ✓{" "}
                          {owner.hostType === "broker"
                            ? c.badges.approvedBroker
                            : c.badges.verifiedOwner}
                        </span>
                      ) : (
                        <span className="text-ink-secondary">{c.notVerified}</span>
                      )}
                    </p>
                  </Td>
                  <Td>
                    <Pill tone={STATUS_TONE[p.status] ?? "neutral"}>
                      {c.propertyStatus[p.status]}
                    </Pill>
                    {p.unpublished_reason && (
                      <p className="mt-1 max-w-[220px] text-xs text-ink-secondary">
                        {blockerTexts(locale, p.unpublished_reason).join(" · ")}
                      </p>
                    )}
                  </Td>
                  <Td end>
                    <span
                      className={`tabular-nums ${photos < 5 ? "font-semibold text-red-600" : ""}`}
                    >
                      {photos}
                    </span>
                  </Td>
                  <Td>
                    <div className="flex flex-col items-start gap-1">
                      {p.flagged_for_review && (
                        <Pill tone="danger">🚩 {blockerTexts(locale, p.flag_reason ?? "")}</Pill>
                      )}
                      {strikesN > 0 && (
                        <Pill tone="warn">
                          {t.strikes}: {strikesN}
                        </Pill>
                      )}
                      {dupIds.has(p.id) && <Pill tone="info">⧉ {t.filters.duplicates}</Pill>}
                    </div>
                  </Td>
                  <Td>
                    <ListingAdminActions
                      propertyId={p.id}
                      ownerId={p.owner_id}
                      status={p.status}
                      flagged={p.flagged_for_review}
                      ownerVerified={owner?.verified ?? false}
                    />
                  </Td>
                </Tr>
              );
            })}
          </tbody>
        </Table>
      )}

      <Section title={t.duplicatesTitle} count={(dupFlags ?? []).length}>
        {(dupFlags ?? []).length === 0 ? (
          <EmptyState icon="check" title={t.noDuplicates} />
        ) : (
          <div className="flex flex-col gap-sm">
            {(dupFlags ?? []).map((d) => {
              const a = dupProps.get(d.property_id);
              const b = dupProps.get(d.other_property_id);
              return (
                <Card key={d.id} tone="warn">
                  <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
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
                        {d.reasons.map((r) => t.reasons[r] ?? r).join(" · ")} ·{" "}
                        {Math.round(Number(d.score) * 100)}%
                      </p>
                    </div>
                    <DuplicateFlagActions id={d.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {(strikes ?? []).length > 0 && (
        <Section title={t.strikesTitle} count={(strikes ?? []).filter((s) => !s.revoked_at).length}>
          <Table minWidth={560}>
            <tbody>
              {(strikes ?? []).map((s) => (
                <Tr key={s.id}>
                  <Td className={s.revoked_at ? "text-ink-secondary line-through" : "font-medium"}>
                    {owners.get(s.owner_id)?.name ?? "—"}
                  </Td>
                  <Td className={s.revoked_at ? "text-ink-secondary line-through" : ""}>
                    {s.reason}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-ink-secondary">
                    {date(locale, s.created_at)}
                  </Td>
                  <Td end>{!s.revoked_at && <RevokeStrike id={s.id} />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}
    </>
  );
}
