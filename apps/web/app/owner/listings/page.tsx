import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { daysSince } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { blockerTexts, common } from "@/lib/i18n/common";
import { money } from "@/lib/i18n/format";
import { getOwnerListings, getOwnerProfile } from "@/lib/queries/owner-dashboard";
import { OwnerListingActions } from "@/components/owner-listing-actions";
import { EmptyState, PageHeader, Pill, type PillTone } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

const statusTone: Record<string, PillTone> = {
  draft: "neutral",
  pending_review: "warn",
  published: "success",
  suspended: "danger",
};

export default async function OwnerListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].listings;
  const d = dashboardDict[locale].host;
  const c = common[locale];
  const [listings, profile] = await Promise.all([
    getOwnerListings(user.id),
    getOwnerProfile(user.id),
  ]);

  // Live reasons straight from the DB rule (photos, price, verification, authorization, subscription).
  const blockers = new Map<string, string[]>();
  await Promise.all(
    listings
      .filter((l) => l.status !== "published")
      .map(async (l) => {
        const { data } = await supabase.rpc("property_publish_blockers", { p_property_id: l.id });
        blockers.set(l.id, data ?? []);
      }),
  );

  const linkCls =
    "rounded-lg px-sm py-1 text-sm font-medium text-ink-secondary hover:bg-surface-soft hover:text-ink";

  return (
    <>
      <PageHeader
        title={t.title}
        count={listings.length}
        actions={
          <Link
            href="/owner/properties/new"
            className="flex items-center gap-xs rounded-xl bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            <Icon name="plus" className="size-4" strokeWidth={2.4} />
            {t.add}
          </Link>
        }
      />

      {listings.length === 0 ? (
        <EmptyState icon="building" title={t.empty} body={t.emptyBody} />
      ) : (
        <div className="flex flex-col gap-sm">
          {listings.map((l) => {
            const reasons = l.status === "published" ? [] : (blockers.get(l.id) ?? []);
            const extra =
              l.status === "suspended" && l.unpublishedReason ? [l.unpublishedReason] : [];
            const allReasons = [...blockerTexts(locale, reasons), ...extra];
            const age = daysSince(l.calendarUpdatedAt);
            return (
              <article
                key={l.id}
                className="flex flex-col gap-md rounded-2xl border border-border bg-surface p-md shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:flex-row"
              >
                <Link
                  href={`/owner/properties/${l.id}/photos`}
                  className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-surface-soft sm:w-52"
                >
                  {l.coverImageUrl ? (
                    <Image
                      src={l.coverImageUrl}
                      alt={l.title}
                      fill
                      sizes="(min-width: 640px) 208px, 100vw"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full flex-col items-center justify-center gap-xs text-xs font-medium text-ink-secondary">
                      <Icon name="camera" className="size-6" />
                      {t.managePhotos}
                    </span>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-sm">
                  <div className="flex flex-wrap items-start justify-between gap-sm">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate font-display text-lg font-semibold">{l.title}</p>
                      <p className="text-sm text-ink-secondary">
                        <span className="font-semibold text-ink">
                          {money(locale, l.pricePerNight)}
                        </span>{" "}
                        {t.perNight}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-xs">
                      <Pill tone={statusTone[l.status]}>{c.propertyStatus[l.status]}</Pill>
                      {l.flagged && <Pill tone="danger">{t.flagged}</Pill>}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-xs">
                    <Pill tone={l.photoCount < 5 ? "danger" : "neutral"}>
                      <Icon name="camera" className="size-3.5" />
                      {t.photos(l.photoCount, 5)}
                    </Pill>
                    {age !== null && (
                      <Pill tone={age >= 7 ? "warn" : "neutral"}>
                        <Icon name="calendar" className="size-3.5" />
                        {t.calendarAge(c.daysAgo(age))}
                      </Pill>
                    )}
                    {l.monthlyRental && <Pill tone="info">{t.monthly}</Pill>}
                  </div>

                  {l.status !== "published" &&
                    (allReasons.length > 0 ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/60 px-md py-sm text-sm">
                        <p className="font-medium">{t.whyNotLive}</p>
                        <ul className="mt-xs flex flex-col gap-0.5 text-ink-secondary">
                          {allReasons.map((r) => (
                            <li key={r} className="flex items-start gap-xs">
                              <Icon
                                name="alert"
                                className="mt-0.5 size-3.5 shrink-0 text-amber-600"
                              />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      l.status !== "suspended" && (
                        <p className="flex items-center gap-xs rounded-xl bg-turquoise-light px-md py-sm text-sm font-medium text-turquoise-dark">
                          <Icon name="check" className="size-4" />
                          {t.readyToPublish}
                        </p>
                      )
                    ))}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-sm border-t border-border pt-sm">
                    <div className="-ms-sm flex flex-wrap gap-0.5">
                      <Link href={`/owner/properties/${l.id}/edit`} className={linkCls}>
                        {t.edit}
                      </Link>
                      <Link href={`/owner/properties/${l.id}/photos`} className={linkCls}>
                        {t.managePhotos}
                      </Link>
                      <Link href={`/owner/calendar?p=${l.id}`} className={linkCls}>
                        {d.quickBlock}
                      </Link>
                      {profile.hostType === "broker" && (
                        <Link href={`/owner/properties/${l.id}/authorization`} className={linkCls}>
                          {t.authorization}
                        </Link>
                      )}
                      {l.status === "published" && (
                        <Link href={`/properties/${l.slug}`} className={linkCls}>
                          <Icon name="external" className="inline size-3.5" />
                        </Link>
                      )}
                    </div>
                    <OwnerListingActions
                      propertyId={l.id}
                      status={l.status}
                      canPublish={reasons.length === 0}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
