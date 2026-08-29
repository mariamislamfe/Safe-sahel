"use client";

import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import Link from "next/link";
import L from "leaflet";
import { formatEgp } from "@safe-sahel/utils";
import type { DisplayProperty } from "@/components/property-card";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icons reference image paths that don't survive a
// bundler — build a simple inline SVG pin instead of fighting that.
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#18B7B0;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);transform:rotate(-45deg);"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

export function PropertyMap({ properties }: { properties: DisplayProperty[] }) {
  const pins = useMemo(
    () =>
      properties.filter(
        (p): p is DisplayProperty & { latitude: number; longitude: number } =>
          p.latitude !== null && p.longitude !== null,
      ),
    [properties],
  );

  const center: [number, number] =
    pins.length > 0 ? [pins[0]!.latitude, pins[0]!.longitude] : [30.9, 28.2];

  if (pins.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-border bg-surface-soft text-sm text-ink-secondary">
        No location data available for these stays yet.
      </div>
    );
  }

  return (
    <div className="h-[420px] overflow-hidden rounded-xl border border-border sm:h-[560px]">
      <MapContainer
        center={center}
        zoom={9}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pins.map((property) => (
          <Marker
            key={property.id}
            position={[property.latitude, property.longitude]}
            icon={pinIcon}
          >
            <Popup>
              <Link href={`/properties/${property.slug}`} className="flex flex-col gap-1">
                <span className="font-medium text-ink">{property.title}</span>
                <span className="text-sm text-ink-secondary">
                  {formatEgp(property.pricePerNight)} / night
                </span>
              </Link>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
