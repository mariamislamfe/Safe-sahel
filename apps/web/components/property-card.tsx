import Image from "next/image";
import Link from "next/link";
import { formatEgp } from "@safe-sahel/utils";
import type { PropertyListItem } from "@/lib/queries/properties";
import { FavoriteButton } from "@/components/favorite-button";

export type DisplayProperty = {
  id: string;
  slug: string;
  title: string;
  compoundName: string | null;
  imageUrl: string | null;
  rating: number | null;
  reviewCount: number;
  maxGuests: number;
  bedrooms: number;
  pricePerNight: number;
  dayUseAvailable: boolean;
  verified: boolean;
  featured: boolean;
  amenities: string[];
  latitude: number | null;
  longitude: number | null;
};

export function fromRealProperty(p: PropertyListItem): DisplayProperty {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    compoundName: p.compoundName,
    imageUrl: p.coverImageUrl,
    rating: p.rating,
    reviewCount: p.reviewCount,
    maxGuests: p.maxGuests,
    bedrooms: p.bedrooms,
    pricePerNight: p.pricePerNight,
    dayUseAvailable: p.dayUseEnabled,
    verified: p.verified,
    featured: p.featured,
    amenities: p.amenityPreview,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}

export function PropertyCard({
  property,
  priority = false,
}: {
  property: DisplayProperty;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/properties/${property.slug}`}
      className="group flex w-full flex-none flex-col overflow-hidden rounded-xl border border-border bg-surface transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-soft">
        {property.imageUrl ? (
          <Image
            src={property.imageUrl}
            alt={property.title}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 40vw, 85vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-ink-secondary">
            No photo yet
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-sm">
          <div className="flex flex-wrap gap-xs">
            {property.featured && (
              <span className="rounded-full bg-turquoise px-sm py-[3px] text-[11px] font-semibold text-white shadow-sm">
                Featured
              </span>
            )}
            {property.verified && (
              <span className="rounded-full bg-butter px-sm py-[3px] text-[11px] font-semibold text-ink shadow-sm">
                Verified
              </span>
            )}
            {property.dayUseAvailable && (
              <span className="rounded-full bg-surface/95 px-sm py-[3px] text-[11px] font-semibold text-turquoise-dark shadow-sm">
                Day use
              </span>
            )}
          </div>
          <div className="shrink-0">
            <FavoriteButton propertyId={property.id} variant="icon" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1 p-md">
        <div className="flex items-start justify-between gap-sm">
          <p className="line-clamp-1 font-display text-[15px] font-semibold text-ink">
            {property.title}
          </p>
          {property.rating !== null && (
            <span className="flex shrink-0 items-center gap-[3px] text-[13px] font-medium text-ink">
              <span className="text-butter">★</span>
              {property.rating.toFixed(1)}
            </span>
          )}
        </div>
        {property.compoundName && (
          <p className="line-clamp-1 text-[13px] text-ink-secondary">{property.compoundName}</p>
        )}
        <p className="text-[13px] text-ink-secondary">
          {property.maxGuests} guests · {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}
        </p>
        <p className="mt-1 text-[15px] text-ink">
          <span className="text-ink-secondary">From</span>{" "}
          <span className="font-semibold">{formatEgp(property.pricePerNight)}</span>{" "}
          <span className="text-ink-secondary">/ night</span>
        </p>
      </div>
    </Link>
  );
}
