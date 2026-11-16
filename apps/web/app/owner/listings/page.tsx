import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { daysSince } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { blockerTexts, common } from "@/lib/i18n/common";
import { money } from "@/lib/i18n/format";
import { getOwnerListings, getOwnerProfile } from "@/lib/queries/owner-dashboard";
import { OwnerListingActions } from "@/components/owner-listing-actions";

const statusStyles: Record<string, string> = {
  draft: "bg-surface-soft text-ink-secondary",
  pending_review: "bg-butter-soft text-ink",
  published: "bg-turquoise-light text-turquoise-dark",
  suspended: "bg-red-50 text-red-700",
};

export default async function OwnerListingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].listings;
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

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between gap-md">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <Link
          href="/owner/properties/new"
          className="rounded-md bg-turquoise px-lg py-sm font-medium text-white hover:bg-turquoise-dark"
        >
          + {t.add}
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-2xl border border-dashed border-border p-3xl text-center">
          <p className="font-medium text-ink">{t.empty}</p>
          <p className="max-w-sm text-sm text-ink-secondary">{t.emptyBody}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {listings.map((l) => {
            const reasons = l.status === "published" ? [] : (blockers.get(l.id) ?? []);
            const extra =
              l.status === "suspended" && l.unpublishedReason ? [l.unpublishedReason] : [];
            const age = daysSince(l.calendarUpdatedAt);
            return (
              <div
                key={l.id}
                className="flex flex-col gap-md rounded-2xl border border-border p-md sm:flex-row"
              >
                <Link
                  href={`/owner/properties/${l.id}/edit`}
                  className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-surface-soft sm:w-48"
                >
                  {l.coverImageUrl ? (
                    <Image
                      src={l.coverImageUrl}
                      alt={l.title}
                      fill
                      sizes="192px"
                      className="object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center text-xs text-ink-secondary">
                      📷
                    </span>
                  )}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-sm">
                  <div className="flex flex-wrap items-start justify-between gap-sm">
                    <div className="min-w-0">
                      <p className="truncate font-display font-semibold text-ink">{l.title}</p>
                      <p className="text-sm text-ink-secondary">
                        {money(locale, l.pricePerNight)} {t.perNight} ·{" "}
                        <span className={l.photoCount < 5 ? "font-medium text-red-600" : ""}>
                          {t.photos(l.photoCount, 5)}
                        </span>
                        {l.monthlyRental && <> · 🎓 {t.monthly}</>}
                      </p>
                      {age !== null && (
                        <p className="text-xs text-ink-secondary">
                          🗓️ {t.calendarAge(c.daysAgo(age))}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-xs">
                      <span
                        className={`rounded-full px-sm py-xs text-xs font-medium ${statusStyles[l.status]}`}
                      >
                        {c.propertyStatus[l.status]}
                      </span>
                      {l.flagged && (
                        <span className="rounded-full bg-red-50 px-sm py-xs text-xs font-medium text-red-700">
                          {t.flagged}
                        </span>
                      )}
                    </div>
                  </div>

                  {l.status !== "published" &&
                    (reasons.length + extra.length > 0 ? (
                      <div className="rounded-lg bg-butter-soft px-md py-sm text-sm">
                        <p className="font-medium text-ink">{t.whyNotLive}</p>
                        <ul className="mt-xs flex flex-col gap-0.5 text-ink-secondary">
                          {[...blockerTexts(locale, reasons), ...extra].map((r) => (
                            <li key={r}>• {r}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      l.status !== "suspended" && (
                        <p className="rounded-lg bg-turquoise-light px-md py-sm text-sm font-medium text-turquoise-dark">
                          ✓ {t.readyToPublish}
                        </p>
                      )
                    ))}

                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <div className="flex flex-wrap gap-sm text-sm font-medium">
                      <Link
                        href={`/owner/properties/${l.id}/edit`}
                        className="text-turquoise-dark hover:underline"
                      >
                        {t.edit}
                      </Link>
                      <Link
                        href={`/owner/properties/${l.id}/photos`}
                        className="text-turquoise-dark hover:underline"
                      >
                        {t.managePhotos}
                      </Link>
                      {profile.hostType === "broker" && (
                        <Link
                          href={`/owner/properties/${l.id}/authorization`}
                          className="text-turquoise-dark hover:underline"
                        >
                          {t.authorization}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
