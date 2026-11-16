import type { Metadata } from "next";
import { LocationCard } from "@/components/location-card";
import { getLocations } from "@/lib/queries/locations";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

export const metadata: Metadata = {
  title: "Locations · Safe Sahel",
  description: "Browse North Coast compounds on Safe Sahel.",
};

export default async function LocationsPage() {
  const [locations, locale] = await Promise.all([getLocations(), getLocale()]);
  const t = getDictionary(locale).home;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-lg px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-3xl font-bold tracking-tight">{t.exploreByLocation}</h1>
        <p className="text-ink-secondary">{t.exploreByLocationSubtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
        {locations.map((location) => (
          <LocationCard
            key={location.id}
            name={location.name}
            nameAr={location.nameAr}
            area={location.area}
            propertyCount={location.propertyCount}
            imageUrl={location.coverImageUrl}
            locale={locale}
          />
        ))}
      </div>
    </main>
  );
}
