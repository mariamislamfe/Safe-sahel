import type { Metadata } from "next";
import { fromRealProperty } from "@/components/property-card";
import { FilterBar } from "@/components/filter-bar";
import { SearchResultsView } from "@/components/search-results-view";
import { getPublishedProperties, type PropertyFilters } from "@/lib/queries/properties";

export const metadata: Metadata = {
  title: "Search properties · Safe Sahel",
  description: "Browse chalets and villas on Egypt's North Coast.",
};

function toNumber(value: string | undefined): number | undefined {
  const n = Number(value);
  return value && !Number.isNaN(n) ? n : undefined;
}

export default async function SearchPage(props: PageProps<"/search">) {
  const params = await props.searchParams;
  const get = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : undefined;

  const filters: PropertyFilters = {
    location: get("location"),
    type: get("type"),
    minGuests: toNumber(get("guests")),
    minBedrooms: toNumber(get("bedrooms")),
    minPrice: toNumber(get("minPrice")),
    maxPrice: toNumber(get("maxPrice")),
    verifiedOnly: get("verified") === "1",
    beachAccess: get("beach") === "1",
    poolAccess: get("pool") === "1",
    seaView: get("seaView") === "1",
    sort: (get("sort") as PropertyFilters["sort"]) ?? "newest",
  };

  const properties = await getPublishedProperties(filters);
  const location = get("location");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-xl px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {location ? `Stays in ${location}` : "All stays"}
        </h1>
        <p className="text-ink-secondary">{properties.length} places to stay on the North Coast.</p>
      </div>

      <FilterBar />

      {properties.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border p-4xl text-center">
          <p className="font-medium text-ink">No properties match your filters</p>
          <p className="max-w-sm text-sm text-ink-secondary">
            Try widening your search, or check back soon — new stays are added often. If the site is
            freshly set up, run <code className="font-mono text-xs">supabase/seed.sql</code> for
            example listings.
          </p>
        </div>
      ) : (
        <SearchResultsView properties={properties.map(fromRealProperty)} />
      )}
    </main>
  );
}
