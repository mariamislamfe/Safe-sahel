"use client";

import Image from "next/image";
import Link from "next/link";
import type { DisplayProperty } from "@/lib/display-property";
import { FavoriteButton } from "@/components/favorite-button";
import { useLocale } from "@/lib/i18n/locale-provider";
import { getDictionary } from "@/lib/i18n/dictionary";
import { common } from "@/lib/i18n/common";
import { money } from "@/lib/i18n/format";

export type { DisplayProperty };

export function PropertyCard({
  property,
  priority = false,
}: {
  property: DisplayProperty;
  priority?: boolean;
}) {
  const locale = useLocale();
  const t = getDictionary(locale).property;
  const badges = common[locale].badges;
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
            {t.noPhoto}
          </div>
        )}

        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-sm">
          <div className="flex flex-wrap gap-xs">
            {property.featured && (
              <span className="rounded-full bg-turquoise px-sm py-[3px] text-[11px] font-semibold text-white shadow-sm">
                {t.featured}
              </span>
            )}
            {property.verified && (
              <span className="rounded-full bg-butter px-sm py-[3px] text-[11px] font-semibold text-ink shadow-sm">
                {property.hostType === "broker" ? badges.approvedBroker : badges.verifiedOwner}
              </span>
            )}
            {property.dayUseAvailable && (
              <span className="rounded-full bg-surface/95 px-sm py-[3px] text-[11px] font-semibold text-turquoise-dark shadow-sm">
                {t.dayUse}
              </span>
            )}
            {property.founding && (
              <span className="rounded-full bg-ink/80 px-sm py-[3px] text-[11px] font-semibold text-butter shadow-sm">
                {badges.foundingHost}
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
          {property.maxGuests} {t.guests} · {property.bedrooms}{" "}
          {property.bedrooms === 1 ? t.bed : t.beds}
        </p>
        <p className="mt-1 text-[15px] text-ink">
          <span className="text-ink-secondary">{t.from}</span>{" "}
          <span className="font-semibold">{money(locale, property.pricePerNight)}</span>{" "}
          <span className="text-ink-secondary">{t.perNight}</span>
        </p>
      </div>
    </Link>
  );
}
