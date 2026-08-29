import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type PropertyListItem = {
  id: string;
  title: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  verified: boolean;
  compoundName: string | null;
  coverImageUrl: string | null;
  dayUseEnabled: boolean;
};

async function fetchPublishedProperties(): Promise<PropertyListItem[]> {
  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      "id, title, type, bedrooms, bathrooms, max_guests, price_per_night, verified, compound_id, day_use_enabled",
    )
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) throw error;
  if (!properties || properties.length === 0) return [];

  const propertyIds = properties.map((p) => p.id);
  const compoundIds = [
    ...new Set(properties.map((p) => p.compound_id).filter(Boolean)),
  ] as string[];

  const [{ data: compounds }, { data: coverImages }] = await Promise.all([
    compoundIds.length > 0
      ? supabase.from("compounds").select("id, name").in("id", compoundIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase
      .from("property_images")
      .select("property_id, url")
      .in("property_id", propertyIds)
      .eq("is_cover", true),
  ]);

  const compoundNameById = new Map((compounds ?? []).map((c) => [c.id, c.name]));
  const coverImageByPropertyId = new Map(
    (coverImages ?? []).map((img) => [img.property_id, img.url]),
  );

  return properties.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    maxGuests: p.max_guests,
    pricePerNight: Number(p.price_per_night),
    verified: p.verified,
    compoundName: p.compound_id ? (compoundNameById.get(p.compound_id) ?? null) : null,
    coverImageUrl: coverImageByPropertyId.get(p.id) ?? null,
    dayUseEnabled: p.day_use_enabled,
  }));
}

export function usePublishedProperties() {
  return useQuery({ queryKey: ["properties", "published"], queryFn: fetchPublishedProperties });
}

export type PropertyDetail = PropertyListItem & {
  description: string | null;
  dayUseEnabled: boolean;
  dayUsePrice: number | null;
  minStayNights: number;
  images: { url: string; isCover: boolean }[];
  amenities: { name: string }[];
};

async function fetchPropertyById(id: string): Promise<PropertyDetail | null> {
  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();

  if (error) throw error;
  if (!property) return null;

  const [{ data: compound }, { data: images }, { data: propertyAmenities }] = await Promise.all([
    property.compound_id
      ? supabase.from("compounds").select("name").eq("id", property.compound_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("property_images")
      .select("url, is_cover")
      .eq("property_id", property.id)
      .order("sort_order"),
    supabase.from("property_amenities").select("amenity_id").eq("property_id", property.id),
  ]);

  const amenityIds = (propertyAmenities ?? []).map((pa) => pa.amenity_id);
  const { data: amenities } =
    amenityIds.length > 0
      ? await supabase.from("amenities").select("name").in("id", amenityIds)
      : { data: [] as { name: string }[] };

  return {
    id: property.id,
    title: property.title,
    type: property.type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.max_guests,
    pricePerNight: Number(property.price_per_night),
    verified: property.verified,
    compoundName: compound?.name ?? null,
    coverImageUrl: images?.find((i) => i.is_cover)?.url ?? images?.[0]?.url ?? null,
    description: property.description,
    dayUseEnabled: property.day_use_enabled,
    dayUsePrice: property.day_use_price !== null ? Number(property.day_use_price) : null,
    minStayNights: property.min_stay_nights,
    images: (images ?? []).map((i) => ({ url: i.url, isCover: i.is_cover })),
    amenities: amenities ?? [],
  };
}

export function usePropertyById(id: string) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: () => fetchPropertyById(id),
    enabled: !!id,
  });
}
