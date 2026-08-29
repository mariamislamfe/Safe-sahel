"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { propertyTypeOptions } from "@safe-sahel/validation";

export function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const [type, setType] = useState(searchParams.get("type") ?? "");
  const [minGuests, setMinGuests] = useState(searchParams.get("guests") ?? "");
  const [minBedrooms, setMinBedrooms] = useState(searchParams.get("bedrooms") ?? "");
  const [minPrice, setMinPrice] = useState(searchParams.get("minPrice") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("maxPrice") ?? "");
  const [beachAccess, setBeachAccess] = useState(searchParams.get("beach") === "1");
  const [poolAccess, setPoolAccess] = useState(searchParams.get("pool") === "1");
  const [seaView, setSeaView] = useState(searchParams.get("seaView") === "1");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verified") === "1");
  const [sort, setSort] = useState(searchParams.get("sort") ?? "newest");

  function apply() {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string) =>
      value ? params.set(key, value) : params.delete(key);

    set("type", type);
    set("guests", minGuests);
    set("bedrooms", minBedrooms);
    set("minPrice", minPrice);
    set("maxPrice", maxPrice);
    set("beach", beachAccess ? "1" : "");
    set("pool", poolAccess ? "1" : "");
    set("seaView", seaView ? "1" : "");
    set("verified", verifiedOnly ? "1" : "");
    set("sort", sort === "newest" ? "" : sort);

    router.push(`/search?${params.toString()}`);
    setOpen(false);
  }

  function clearAll() {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of [
      "type",
      "guests",
      "bedrooms",
      "minPrice",
      "maxPrice",
      "beach",
      "pool",
      "seaView",
      "verified",
      "sort",
    ]) {
      params.delete(key);
    }
    router.push(`/search?${params.toString()}`);
  }

  const activeCount =
    [type, minGuests, minBedrooms, minPrice, maxPrice].filter(Boolean).length +
    [beachAccess, poolAccess, seaView, verifiedOnly].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-md">
      <div className="flex items-center justify-between gap-md">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-xs rounded-full border border-border px-lg py-sm text-sm font-medium text-ink shadow-sm hover:border-turquoise"
        >
          Filters{" "}
          {activeCount > 0 && (
            <span className="rounded-full bg-turquoise px-2 text-xs text-white">{activeCount}</span>
          )}
        </button>

        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            const params = new URLSearchParams(searchParams.toString());
            if (e.target.value === "newest") params.delete("sort");
            else params.set("sort", e.target.value);
            router.push(`/search?${params.toString()}`);
          }}
          className="rounded-full border border-border bg-surface px-md py-sm text-sm text-ink outline-none focus:border-turquoise"
        >
          <option value="newest">Newest</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="rating">Top rated</option>
        </select>
      </div>

      {open && (
        <div className="flex flex-col gap-lg rounded-xl border border-border bg-surface p-lg shadow-sm">
          <div className="grid grid-cols-2 gap-md sm:grid-cols-4">
            <label className="flex flex-col gap-xs text-sm">
              <span className="font-medium text-ink">Type</span>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded-sm border border-border bg-surface px-sm py-xs outline-none focus:border-turquoise"
              >
                <option value="">Any</option>
                {propertyTypeOptions.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-xs text-sm">
              <span className="font-medium text-ink">Guests</span>
              <input
                type="number"
                min={1}
                value={minGuests}
                onChange={(e) => setMinGuests(e.target.value)}
                className="rounded-sm border border-border bg-surface px-sm py-xs outline-none focus:border-turquoise"
              />
            </label>
            <label className="flex flex-col gap-xs text-sm">
              <span className="font-medium text-ink">Bedrooms</span>
              <input
                type="number"
                min={1}
                value={minBedrooms}
                onChange={(e) => setMinBedrooms(e.target.value)}
                className="rounded-sm border border-border bg-surface px-sm py-xs outline-none focus:border-turquoise"
              />
            </label>
            <div className="flex flex-col gap-xs text-sm">
              <span className="font-medium text-ink">Price / night</span>
              <div className="flex gap-xs">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full rounded-sm border border-border bg-surface px-sm py-xs outline-none focus:border-turquoise"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full rounded-sm border border-border bg-surface px-sm py-xs outline-none focus:border-turquoise"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-md">
            <Toggle label="Beach access" checked={beachAccess} onChange={setBeachAccess} />
            <Toggle label="Pool" checked={poolAccess} onChange={setPoolAccess} />
            <Toggle label="Sea view" checked={seaView} onChange={setSeaView} />
            <Toggle label="Verified only" checked={verifiedOnly} onChange={setVerifiedOnly} />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={clearAll}
              className="text-sm font-medium text-ink-secondary hover:text-ink"
            >
              Clear all
            </button>
            <button
              onClick={apply}
              className="rounded-full bg-turquoise px-xl py-sm text-sm font-semibold text-white hover:bg-turquoise-dark"
            >
              Show results
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-md py-xs text-sm ${
        checked
          ? "border-turquoise bg-turquoise-light text-turquoise-dark"
          : "border-border text-ink-secondary"
      }`}
    >
      {label}
    </button>
  );
}
