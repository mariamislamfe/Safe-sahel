import type { PropertyListItem } from "@/lib/queries/properties";

// Plain (non-"use client") module so server pages can call fromRealProperty()
// directly. Functions exported from a "use client" file become client
// references and throw when invoked on the server.

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
  hostType: "owner" | "broker" | null;
  founding: boolean;
  monthlyRental: boolean;
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
    verified: p.host.verified,
    hostType: p.host.hostType,
    founding: p.host.founding,
    monthlyRental: p.monthlyRentalEnabled,
    featured: p.featured,
    amenities: p.amenityPreview,
    latitude: p.latitude,
    longitude: p.longitude,
  };
}
