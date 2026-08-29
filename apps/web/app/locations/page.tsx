import type { Metadata } from "next";
import { LocationCard } from "@/components/location-card";
import { getLocations } from "@/lib/queries/locations";

export const metadata: Metadata = {
  title: "Locations · Safe Sahel",
  description: "Browse North Coast compounds on Safe Sahel.",
};

export default async function LocationsPage() {
  const locations = await getLocations();

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-lg px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-3xl font-bold tracking-tight">Explore by location</h1>
        <p className="text-ink-secondary">Compounds across Egypt&apos;s North Coast.</p>
      </div>

      {locations.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-2xl border border-dashed border-border px-lg py-4xl text-center">
          <p className="font-medium text-ink">No compounds yet</p>
          <p className="max-w-sm text-sm text-ink-secondary">
            Compounds are added by the team as owners list properties in them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3 lg:grid-cols-4">
          {locations.map((location) => (
            <LocationCard
              key={location.id}
              name={location.name}
              area={location.area}
              propertyCount={location.propertyCount}
              imageUrl={location.coverImageUrl}
            />
          ))}
        </div>
      )}
    </main>
  );
}
