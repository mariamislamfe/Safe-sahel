"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { PropertyCard, type DisplayProperty } from "@/components/property-card";

const PropertyMap = dynamic(() => import("@/components/property-map").then((m) => m.PropertyMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] items-center justify-center rounded-xl border border-border bg-surface-soft text-sm text-ink-secondary sm:h-[560px]">
      Loading map…
    </div>
  ),
});

export function SearchResultsView({ properties }: { properties: DisplayProperty[] }) {
  const [view, setView] = useState<"list" | "map">("list");

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex justify-end">
        <div className="flex rounded-full border border-border p-1">
          <button
            onClick={() => setView("list")}
            className={`rounded-full px-lg py-xs text-sm font-medium transition-colors ${
              view === "list" ? "bg-turquoise text-white" : "text-ink-secondary"
            }`}
          >
            List
          </button>
          <button
            onClick={() => setView("map")}
            className={`rounded-full px-lg py-xs text-sm font-medium transition-colors ${
              view === "map" ? "bg-turquoise text-white" : "text-ink-secondary"
            }`}
          >
            Map
          </button>
        </div>
      </div>

      {view === "list" ? (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <PropertyMap properties={properties} />
      )}
    </div>
  );
}
