import type { Metadata } from "next";
import { fromRealProperty } from "@/components/property-card";
import { FilterBar } from "@/components/filter-bar";
import { SearchResultsView } from "@/components/search-results-view";
import { getPublishedProperties, type PropertyFilters } from "@/lib/queries/properties";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@/lib/i18n/dictionary";

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
    monthlyRental: get("monthly") === "1",
    sort: (get("sort") as PropertyFilters["sort"]) ?? "newest",
  };

  const [properties, locale] = await Promise.all([getPublishedProperties(filters), getLocale()]);
  const t = getDictionary(locale).search;
  const location = get("location");

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-xl px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          {location ? t.titleInLocation(location) : t.title}
        </h1>
        <p className="text-ink-secondary">{t.resultCount(properties.length)}</p>
      </div>

      <FilterBar />

      {properties.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border p-4xl text-center">
          <p className="font-medium text-ink">{t.noResultsTitle}</p>
          <p className="max-w-sm text-sm text-ink-secondary">{t.noResultsBody}</p>
        </div>
      ) : (
        <SearchResultsView properties={properties.map(fromRealProperty)} />
      )}
    </main>
  );
}
