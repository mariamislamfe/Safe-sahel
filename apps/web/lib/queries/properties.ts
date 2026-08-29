import { createClient } from "@/lib/supabase/server";
import { propertyTypeOptions, type PropertyTypeOption } from "@safe-sahel/validation";
import type { CancellationPolicyEnum } from "@safe-sahel/types";

export type PropertyListItem = {
  id: string;
  slug: string;
  title: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  verified: boolean;
  featured: boolean;
  compoundName: string | null;
  coverImageUrl: string | null;
  dayUseEnabled: boolean;
  rating: number | null;
  reviewCount: number;
  amenityPreview: string[];
  latitude: number | null;
  longitude: number | null;
};

export type PropertyDetail = {
  id: string;
  ownerId: string;
  slug: string;
  title: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  pricePerNight: number;
  verified: boolean;
  compoundName: string | null;
  coverImageUrl: string | null;
  description: string | null;
  viewType: string | null;
  poolAccess: boolean;
  beachAccess: boolean;
  dayUseEnabled: boolean;
  dayUsePrice: number | null;
  minStayNights: number;
  images: { url: string; isCover: boolean }[];
  amenities: { name: string; icon: string | null; category: string | null }[];
  sizeSqm: number | null;
  beds: number | null;
  checkInInstructions: string | null;
  villageEntryRequirements: string | null;
  beachAccessDetails: string | null;
  petsAllowed: boolean;
  partiesAllowed: boolean;
  smokingAllowed: boolean;
  commercialPhotographyAllowed: boolean;
  cancellationPolicy: CancellationPolicyEnum;
};

/**
 * Deliberately plain per-table queries instead of PostgREST's embedded
 * `select("*, compound:compounds(*)")` syntax — that relies on a
 * `Relationships` array in the generated types to type-check the join, and
 * packages/types/supabase-generated.ts is hand-maintained without one (see
 * its doc comment). Multiple simple, reliably-typed queries beat one
 * fragile clever one here; revisit once real `supabase gen types` output
 * carries relationship metadata.
 */
export type PropertyFilters = {
  location?: string;
  type?: string;
  minGuests?: number;
  minBedrooms?: number;
  minPrice?: number;
  maxPrice?: number;
  verifiedOnly?: boolean;
  beachAccess?: boolean;
  poolAccess?: boolean;
  seaView?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
};

export async function getPublishedProperties(
  filters: PropertyFilters = {},
): Promise<PropertyListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(
      "id, slug, title, type, bedrooms, bathrooms, max_guests, price_per_night, verified, featured, compound_id, day_use_enabled, view_type, created_at, latitude, longitude",
    )
    .eq("status", "published")
    .is("deleted_at", null);

  if (filters.type && propertyTypeOptions.includes(filters.type as PropertyTypeOption)) {
    query = query.eq("type", filters.type as PropertyTypeOption);
  }
  if (filters.minGuests) query = query.gte("max_guests", filters.minGuests);
  if (filters.minBedrooms) query = query.gte("bedrooms", filters.minBedrooms);
  if (filters.minPrice) query = query.gte("price_per_night", filters.minPrice);
  if (filters.maxPrice) query = query.lte("price_per_night", filters.maxPrice);
  if (filters.verifiedOnly) query = query.eq("verified", true);
  if (filters.beachAccess) query = query.eq("beach_access", true);
  if (filters.poolAccess) query = query.eq("pool_access", true);
  if (filters.seaView) query = query.eq("view_type", "sea_view");

  if (filters.sort === "price_asc") query = query.order("price_per_night", { ascending: true });
  else if (filters.sort === "price_desc")
    query = query.order("price_per_night", { ascending: false });
  else {
    // Default order: featured first, then verified, then newest within each group.
    query = query
      .order("featured", { ascending: false })
      .order("verified", { ascending: false })
      .order("created_at", { ascending: false });
  }

  const { data: allProperties, error } = await query.limit(60);

  if (error) throw error;
  if (!allProperties || allProperties.length === 0) return [];

  // Location is a name on a related table, not a column on properties, so
  // it's filtered client-side below once compound names are resolved.
  const properties = allProperties;

  const propertyIds = properties.map((p) => p.id);
  const compoundIds = [
    ...new Set(properties.map((p) => p.compound_id).filter(Boolean)),
  ] as string[];

  const [
    { data: compounds },
    { data: coverImages },
    { data: reviews },
    { data: propertyAmenities },
  ] = await Promise.all([
    compoundIds.length > 0
      ? supabase.from("compounds").select("id, name, latitude, longitude").in("id", compoundIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            latitude: number | null;
            longitude: number | null;
          }[],
        }),
    supabase
      .from("property_images")
      .select("property_id, url")
      .in("property_id", propertyIds)
      .eq("is_cover", true),
    supabase.from("reviews").select("property_id, rating_overall").in("property_id", propertyIds),
    supabase
      .from("property_amenities")
      .select("property_id, amenity_id")
      .in("property_id", propertyIds),
  ]);

  const compoundNameById = new Map((compounds ?? []).map((c) => [c.id, c.name]));
  const compoundCoordsById = new Map(
    (compounds ?? []).map((c) => [c.id, { lat: c.latitude, lng: c.longitude }]),
  );
  const coverImageByPropertyId = new Map(
    (coverImages ?? []).map((img) => [img.property_id, img.url]),
  );

  const ratingsByPropertyId = new Map<string, number[]>();
  for (const r of reviews ?? []) {
    const list = ratingsByPropertyId.get(r.property_id) ?? [];
    list.push(r.rating_overall);
    ratingsByPropertyId.set(r.property_id, list);
  }

  const amenityIds = [...new Set((propertyAmenities ?? []).map((pa) => pa.amenity_id))];
  const { data: amenityRows } =
    amenityIds.length > 0
      ? await supabase.from("amenities").select("id, name").in("id", amenityIds)
      : { data: [] as { id: string; name: string }[] };
  const amenityNameById = new Map((amenityRows ?? []).map((a) => [a.id, a.name]));
  const amenityIdsByPropertyId = new Map<string, string[]>();
  for (const pa of propertyAmenities ?? []) {
    const list = amenityIdsByPropertyId.get(pa.property_id) ?? [];
    list.push(pa.amenity_id);
    amenityIdsByPropertyId.set(pa.property_id, list);
  }

  let results = properties.map((p) => {
    const ratings = ratingsByPropertyId.get(p.id) ?? [];
    const amenityNames = (amenityIdsByPropertyId.get(p.id) ?? [])
      .map((id) => amenityNameById.get(id))
      .filter((name): name is string => !!name);

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: Number(p.price_per_night),
      verified: p.verified,
      featured: p.featured,
      compoundName: p.compound_id ? (compoundNameById.get(p.compound_id) ?? null) : null,
      coverImageUrl: coverImageByPropertyId.get(p.id) ?? null,
      dayUseEnabled: p.day_use_enabled,
      rating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      reviewCount: ratings.length,
      amenityPreview: amenityNames.slice(0, 3),
      latitude:
        p.latitude ?? (p.compound_id ? (compoundCoordsById.get(p.compound_id)?.lat ?? null) : null),
      longitude:
        p.longitude ??
        (p.compound_id ? (compoundCoordsById.get(p.compound_id)?.lng ?? null) : null),
    };
  });

  if (filters.location) {
    const needle = filters.location.toLowerCase();
    results = results.filter((r) => r.compoundName?.toLowerCase().includes(needle));
  }

  if (filters.sort === "rating") {
    results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  }

  return results;
}

export async function getPropertiesByIds(ids: string[]): Promise<PropertyListItem[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();

  const { data: properties, error } = await supabase
    .from("properties")
    .select(
      "id, slug, title, type, bedrooms, bathrooms, max_guests, price_per_night, verified, featured, compound_id, day_use_enabled, latitude, longitude",
    )
    .in("id", ids);

  if (error) throw error;
  if (!properties || properties.length === 0) return [];

  const propertyIds = properties.map((p) => p.id);
  const compoundIds = [
    ...new Set(properties.map((p) => p.compound_id).filter(Boolean)),
  ] as string[];

  const [
    { data: compounds },
    { data: coverImages },
    { data: reviews },
    { data: propertyAmenities },
  ] = await Promise.all([
    compoundIds.length > 0
      ? supabase.from("compounds").select("id, name, latitude, longitude").in("id", compoundIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            latitude: number | null;
            longitude: number | null;
          }[],
        }),
    supabase
      .from("property_images")
      .select("property_id, url")
      .in("property_id", propertyIds)
      .eq("is_cover", true),
    supabase.from("reviews").select("property_id, rating_overall").in("property_id", propertyIds),
    supabase
      .from("property_amenities")
      .select("property_id, amenity_id")
      .in("property_id", propertyIds),
  ]);

  const compoundNameById = new Map((compounds ?? []).map((c) => [c.id, c.name]));
  const compoundCoordsById = new Map(
    (compounds ?? []).map((c) => [c.id, { lat: c.latitude, lng: c.longitude }]),
  );
  const coverImageByPropertyId = new Map(
    (coverImages ?? []).map((img) => [img.property_id, img.url]),
  );

  const ratingsByPropertyId = new Map<string, number[]>();
  for (const r of reviews ?? []) {
    const list = ratingsByPropertyId.get(r.property_id) ?? [];
    list.push(r.rating_overall);
    ratingsByPropertyId.set(r.property_id, list);
  }

  const amenityIds = [...new Set((propertyAmenities ?? []).map((pa) => pa.amenity_id))];
  const { data: amenityRows } =
    amenityIds.length > 0
      ? await supabase.from("amenities").select("id, name").in("id", amenityIds)
      : { data: [] as { id: string; name: string }[] };
  const amenityNameById = new Map((amenityRows ?? []).map((a) => [a.id, a.name]));
  const amenityIdsByPropertyId = new Map<string, string[]>();
  for (const pa of propertyAmenities ?? []) {
    const list = amenityIdsByPropertyId.get(pa.property_id) ?? [];
    list.push(pa.amenity_id);
    amenityIdsByPropertyId.set(pa.property_id, list);
  }

  return properties.map((p) => {
    const ratings = ratingsByPropertyId.get(p.id) ?? [];
    const amenityNames = (amenityIdsByPropertyId.get(p.id) ?? [])
      .map((id) => amenityNameById.get(id))
      .filter((name): name is string => !!name);

    return {
      id: p.id,
      slug: p.slug,
      title: p.title,
      type: p.type,
      bedrooms: p.bedrooms,
      bathrooms: p.bathrooms,
      maxGuests: p.max_guests,
      pricePerNight: Number(p.price_per_night),
      verified: p.verified,
      featured: p.featured,
      compoundName: p.compound_id ? (compoundNameById.get(p.compound_id) ?? null) : null,
      coverImageUrl: coverImageByPropertyId.get(p.id) ?? null,
      dayUseEnabled: p.day_use_enabled,
      rating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      reviewCount: ratings.length,
      amenityPreview: amenityNames.slice(0, 3),
      latitude:
        p.latitude ?? (p.compound_id ? (compoundCoordsById.get(p.compound_id)?.lat ?? null) : null),
      longitude:
        p.longitude ??
        (p.compound_id ? (compoundCoordsById.get(p.compound_id)?.lng ?? null) : null),
    };
  });
}

export type PropertyReview = {
  id: string;
  ratingOverall: number;
  comment: string | null;
  createdAt: string;
  guestName: string | null;
};

export async function getPropertyReviews(propertyId: string): Promise<PropertyReview[]> {
  const supabase = await createClient();
  const { data: reviews } = await supabase
    .from("reviews")
    .select("id, rating_overall, comment, created_at, guest_id")
    .eq("property_id", propertyId)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0) return [];

  const { data: guests } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      reviews.map((r) => r.guest_id),
    );
  const nameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));

  return reviews.map((r) => ({
    id: r.id,
    ratingOverall: r.rating_overall,
    comment: r.comment,
    createdAt: r.created_at,
    guestName: nameById.get(r.guest_id) ?? null,
  }));
}

export async function getPublishedPropertyBySlug(slug: string): Promise<PropertyDetail | null> {
  const supabase = await createClient();

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
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
      .order("sort_order", { ascending: true }),
    supabase.from("property_amenities").select("amenity_id").eq("property_id", property.id),
  ]);

  const amenityIds = (propertyAmenities ?? []).map((pa) => pa.amenity_id);
  const { data: amenities } =
    amenityIds.length > 0
      ? await supabase.from("amenities").select("name, icon, category").in("id", amenityIds)
      : { data: [] as { name: string; icon: string | null; category: string | null }[] };

  return {
    id: property.id,
    ownerId: property.owner_id,
    slug: property.slug,
    title: property.title,
    type: property.type,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.max_guests,
    pricePerNight: Number(property.price_per_night),
    verified: property.verified,
    compoundName: compound?.name ?? null,
    coverImageUrl: images?.find((img) => img.is_cover)?.url ?? images?.[0]?.url ?? null,
    description: property.description,
    viewType: property.view_type,
    poolAccess: property.pool_access,
    beachAccess: property.beach_access,
    dayUseEnabled: property.day_use_enabled,
    dayUsePrice: property.day_use_price !== null ? Number(property.day_use_price) : null,
    minStayNights: property.min_stay_nights,
    images: (images ?? []).map((img) => ({ url: img.url, isCover: img.is_cover })),
    amenities: amenities ?? [],
    sizeSqm: property.size_sqm,
    beds: property.beds,
    checkInInstructions: property.check_in_instructions,
    villageEntryRequirements: property.village_entry_requirements,
    beachAccessDetails: property.beach_access_details,
    petsAllowed: property.pets_allowed,
    partiesAllowed: property.parties_allowed,
    smokingAllowed: property.smoking_allowed,
    commercialPhotographyAllowed: property.commercial_photography_allowed,
    cancellationPolicy: property.cancellation_policy,
  };
}
