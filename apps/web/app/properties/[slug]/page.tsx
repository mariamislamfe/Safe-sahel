import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatEgp } from "@safe-sahel/utils";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { createClient } from "@/lib/supabase/server";
import { getPublishedPropertyBySlug, getPropertyReviews } from "@/lib/queries/properties";
import { getPropertyUnavailableRanges } from "@/lib/queries/availability";
import { getPropertyInventory } from "@/lib/queries/owner";
import { BookingForm } from "@/components/booking-form";
import { FavoriteButton } from "@/components/favorite-button";
import { MessageHostButton } from "@/components/message-host-button";
import { PropertyGallery } from "@/components/property-gallery";
import { RatingBreakdown } from "@/components/rating-breakdown";
import { FaqAccordion } from "@/components/faq-accordion";
import { InventoryPreview } from "@/components/inventory-preview";

export async function generateMetadata(props: PageProps<"/properties/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const property = await getPublishedPropertyBySlug(slug);

  if (!property) return { title: "Property not found · Safe Sahel" };

  return {
    title: `${property.title} · Safe Sahel`,
    description: property.description ?? undefined,
  };
}

const viewTypeLabels: Record<string, string> = {
  sea_view: "Sea view",
  lagoon_view: "Lagoon view",
  garden_view: "Garden view",
  street_view: "Street view",
  no_view: "No view",
};

const amenityCategoryGroup: Record<string, "general" | "bathroomSpa" | "kitchenDining" | "safetyAccessibility" | "entertainment"> = {
  comfort: "general",
  outdoor: "general",
  kitchen: "kitchenDining",
  bathroom: "bathroomSpa",
  spa: "bathroomSpa",
  safety: "safetyAccessibility",
  accessibility: "safetyAccessibility",
  entertainment: "entertainment",
};

export default async function PropertyDetailPage(props: PageProps<"/properties/[slug]">) {
  const { slug } = await props.params;
  const property = await getPublishedPropertyBySlug(slug);

  if (!property) notFound();

  const locale = await getLocale();
  const dict = getDictionary(locale);
  const t = dict.propertyDetail;
  const supabase = await createClient();

  const [unavailableRanges, reviews, inventory, userResult] = await Promise.all([
    getPropertyUnavailableRanges(property.id),
    getPropertyReviews(property.id),
    getPropertyInventory(property.id),
    supabase.auth.getUser(),
  ]);
  const currentUser = userResult.data.user;

  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.ratingOverall, 0) / reviews.length
      : null;

  const amenitiesByGroup = property.amenities.reduce<Record<string, typeof property.amenities>>(
    (acc, amenity) => {
      const group = amenity.category ? (amenityCategoryGroup[amenity.category] ?? "general") : "general";
      (acc[group] ??= []).push(amenity);
      return acc;
    },
    {},
  );
  const groupOrder = ["general", "bathroomSpa", "kitchenDining", "safetyAccessibility", "entertainment"] as const;

  const cancellationInfo = t.cancellationPolicies[property.cancellationPolicy];

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-2xl px-lg py-2xl">
      <PropertyGallery images={property.images} title={property.title} locale={locale} />

      <div className="grid grid-cols-1 gap-2xl lg:grid-cols-3">
        {/* Content */}
        <div className="flex flex-col gap-2xl lg:col-span-2">
          <div className="flex flex-col gap-md border-b border-border pb-xl">
            <div className="flex flex-wrap items-start justify-between gap-md">
              <div className="flex flex-col gap-xs">
                <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                  {property.title}
                </h1>
                <p className="text-ink-secondary">
                  {property.compoundName}
                  {averageRating !== null && (
                    <span className="ms-1">
                      · <span className="text-butter">★</span> {averageRating.toFixed(1)} (
                      {reviews.length})
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-sm">
                {property.verified && (
                  <span className="rounded-full bg-butter px-md py-xs text-sm font-semibold text-ink">
                    Verified
                  </span>
                )}
                <MessageHostButton propertyId={property.id} ownerId={property.ownerId} />
                <FavoriteButton propertyId={property.id} />
              </div>
            </div>

            {/* Quick facts */}
            <div className="flex flex-wrap gap-md text-ink-secondary">
              {property.sizeSqm !== null && (
                <span>
                  {property.sizeSqm} {t.size}
                </span>
              )}
              {property.beds !== null && (
                <span>
                  {property.beds} {t.beds}
                </span>
              )}
              <span>
                {property.bedrooms} {t.bedrooms}
              </span>
              <span>
                {property.bathrooms} {t.bathrooms}
              </span>
              <span>
                {property.maxGuests} {t.guests}
              </span>
              {property.viewType && <span>{viewTypeLabels[property.viewType]}</span>}
            </div>
          </div>

          {property.description && (
            <div className="flex flex-col gap-sm border-b border-border pb-xl">
              <h2 className="font-display text-lg font-semibold">{t.aboutTitle}</h2>
              <p className="max-w-2xl leading-relaxed text-ink">{property.description}</p>
            </div>
          )}

          {/* Safe Sahel protects you */}
          <div className="flex flex-col gap-sm rounded-2xl border border-turquoise/30 bg-turquoise-light/40 p-lg">
            <h2 className="font-display text-lg font-semibold text-ink">{t.protectionTitle}</h2>
            <ul className="flex flex-col gap-xs">
              {t.protectionItems.map((item) => (
                <li key={item} className="flex items-start gap-sm text-sm text-ink-secondary">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-turquoise" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {property.checkInInstructions && (
            <div className="flex flex-col gap-sm border-b border-border pb-xl">
              <h2 className="font-display text-lg font-semibold">{t.checkInTitle}</h2>
              <p className="max-w-2xl leading-relaxed text-ink-secondary">
                {property.checkInInstructions}
              </p>
            </div>
          )}

          {property.villageEntryRequirements && (
            <div className="flex flex-col gap-sm border-b border-border pb-xl">
              <h2 className="font-display text-lg font-semibold">{t.villageEntryTitle}</h2>
              <p className="max-w-2xl leading-relaxed text-ink-secondary">
                {property.villageEntryRequirements}
              </p>
            </div>
          )}

          {property.beachAccess && property.beachAccessDetails && (
            <div className="flex flex-col gap-sm border-b border-border pb-xl">
              <h2 className="font-display text-lg font-semibold">{t.beachAccessTitle}</h2>
              <p className="max-w-2xl leading-relaxed text-ink-secondary">
                {property.beachAccessDetails}
              </p>
            </div>
          )}

          {property.amenities.length > 0 && (
            <div className="flex flex-col gap-lg border-b border-border pb-xl">
              <h2 className="font-display text-lg font-semibold">{t.amenitiesTitle}</h2>
              {groupOrder
                .filter((group) => amenitiesByGroup[group]?.length)
                .map((group) => (
                  <div key={group} className="flex flex-col gap-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">
                      {t.amenityCategories[group]}
                    </p>
                    <div className="grid grid-cols-2 gap-sm sm:grid-cols-3">
                      {amenitiesByGroup[group]!.map((amenity) => (
                        <span
                          key={amenity.name}
                          className="rounded-lg border border-border px-md py-sm text-sm text-ink"
                        >
                          {amenity.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}

          <InventoryPreview inventory={inventory} title="What's inside" />

          {/* House rules */}
          <div className="flex flex-col gap-sm border-b border-border pb-xl">
            <h2 className="font-display text-lg font-semibold">{t.houseRulesTitle}</h2>
            <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
              {(
                [
                  ["pets", property.petsAllowed],
                  ["parties", property.partiesAllowed],
                  ["smoking", property.smokingAllowed],
                  ["commercialPhotography", property.commercialPhotographyAllowed],
                ] as const
              ).map(([key, allowed]) => (
                <div key={key} className="flex flex-col gap-0.5 rounded-lg border border-border px-md py-sm">
                  <span className="text-xs text-ink-secondary">{t.houseRules[key]}</span>
                  <span className={`text-sm font-medium ${allowed ? "text-turquoise-dark" : "text-ink-secondary"}`}>
                    {allowed ? t.allowed : t.notAllowed}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Cancellation policy */}
          <div className="flex flex-col gap-sm border-b border-border pb-xl">
            <h2 className="font-display text-lg font-semibold">{t.cancellationTitle}</h2>
            <p className="max-w-2xl text-sm text-ink-secondary">
              <span className="font-medium text-ink">{cancellationInfo.label}</span> —{" "}
              {cancellationInfo.description}
            </p>
          </div>

          {/* FAQ */}
          <div className="flex flex-col gap-md border-b border-border pb-xl">
            <h2 className="font-display text-lg font-semibold">{t.faqTitle}</h2>
            <FaqAccordion items={[...t.faqItems]} />
          </div>

          {/* Reviews */}
          <div className="flex flex-col gap-md">
            <h2 className="font-display text-lg font-semibold">
              {t.reviewsTitle}
              {averageRating !== null && (
                <>
                  {" · "}
                  <span className="text-butter">★</span> {averageRating.toFixed(1)} ({reviews.length})
                </>
              )}
            </h2>

            {reviews.length > 0 && (
              <RatingBreakdown
                ratings={reviews.map((r) => r.ratingOverall)}
                labels={t.ratingBreakdown}
              />
            )}

            {reviews.length > 0 ? (
              <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="flex flex-col gap-xs rounded-xl border border-border p-md"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink">{review.guestName ?? "Guest"}</span>
                      <span className="text-butter">{"★".repeat(review.ratingOverall)}</span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-ink-secondary">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-secondary">{t.noReviewsYet}</p>
            )}

            {currentUser ? (
              <p className="text-sm text-ink-secondary">{t.reviewFromBookings}</p>
            ) : (
              <p className="text-sm text-ink-secondary">
                {t.loginToReviewPrompt}{" "}
                <Link href="/login" className="font-medium text-turquoise-dark">
                  {t.loginToReviewCta}
                </Link>
              </p>
            )}
          </div>
        </div>

        {/* Booking card */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 flex flex-col gap-md rounded-2xl border border-border bg-surface p-lg shadow-lg shadow-ink/5">
            <p className="font-display text-2xl font-bold text-ink">
              {formatEgp(property.pricePerNight)}{" "}
              <span className="text-base font-normal text-ink-secondary">/ night</span>
            </p>
            {property.dayUseEnabled && property.dayUsePrice !== null && (
              <p className="text-sm text-ink-secondary">
                Day use also available from {formatEgp(property.dayUsePrice)}
              </p>
            )}
            {property.minStayNights > 1 && (
              <p className="text-sm text-ink-secondary">
                Minimum stay: {property.minStayNights} nights
              </p>
            )}
            <BookingForm
              propertyId={property.id}
              pricePerNight={property.pricePerNight}
              minStayNights={property.minStayNights}
              maxGuests={property.maxGuests}
              unavailableRanges={unavailableRanges}
            />
          </div>
        </div>
      </div>
    </main>
  );
}

