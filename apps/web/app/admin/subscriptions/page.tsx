import { nowMs } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { compoundList, profileMap, propertyMap } from "@/lib/queries/admin";
import { getPlatformSetting } from "@/lib/queries/owner-dashboard";
import {
  ChipRow,
  EmptyState,
  FilterTabs,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
  type PillTone,
} from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

const FILTERS = ["all", "active", "expiring", "grace", "expired"] as const;
const TONE: Record<string, PillTone> = {
  active: "success",
  expiring: "warn",
  grace: "warn",
  expired: "danger",
};

export default async function AdminSubscriptionsPage(props: PageProps<"/admin/subscriptions">) {
  await requireSection("subscriptions");
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
  const all = [...latest.values()]
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
    .filter((r) => !compoundId || r.property?.compoundId === compoundId);
  const match = (f: string, state: string) =>
    f === "all" ? true : f === "active" ? state === "active" || state === "expiring" : state === f;
  const rows = all.filter((r) => match(filter, r.state));
  const link = (f: string, c: string) => `/admin/subscriptions?f=${f}${c ? `&c=${c}` : ""}`;

  return (
    <>
      <PageHeader title={t.title} count={all.length} />
      {now < new Date(freeUntil).getTime() && (
        <div className="flex items-start gap-sm rounded-xl bg-turquoise-light px-md py-sm text-sm text-turquoise-dark">
          <Icon name="gift" className="mt-0.5 size-4 shrink-0" />
          {t.freeNote(date(locale, freeUntil))}
        </div>
      )}
      <div className="flex flex-col gap-sm">
        <FilterTabs
          items={FILTERS.map((f) => ({
            href: link(f, compoundId),
            label: t.filters[f]!,
            active: filter === f,
            count: all.filter((r) => match(f, r.state)).length,
          }))}
        />
        <ChipRow
          items={[
            { href: link(filter, ""), label: t.allCompounds, active: !compoundId },
            ...compounds.map((c) => ({
              href: link(filter, c.id),
              label: `${c.is_focus ? "★ " : ""}${locale === "ar" && c.name_ar ? c.name_ar : c.name}`,
              active: compoundId === c.id,
            })),
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="repeat" title={t.empty} body={common[locale].noResults} />
      ) : (
        <Table minWidth={680}>
          <thead>
            <tr>
              <Th>{t.listing}</Th>
              <Th>{t.owner}</Th>
              <Th>{t.plan}</Th>
              <Th>{t.ends}</Th>
              <Th>{t.status}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ s, state, property }) => (
              <Tr key={s.id}>
                <Td className="font-medium">{property?.title ?? "—"}</Td>
                <Td>{owners.get(s.owner_id)?.name ?? "—"}</Td>
                <Td>
                  {plans[s.plan]?.name ?? s.plan}
                  <span className="text-ink-secondary"> · {money(locale, s.amount_egp)}</span>
                  {s.is_founder_rate && " ⭐"}
                </Td>
                <Td className="whitespace-nowrap">{date(locale, s.ends_at)}</Td>
                <Td>
                  <Pill tone={TONE[state]}>{t.filters[state]}</Pill>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
