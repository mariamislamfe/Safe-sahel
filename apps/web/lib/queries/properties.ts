import { createClient } from "@/lib/supabase/server";
import { propertyTypeOptions, type PropertyTypeOption } from "@safe-sahel/validation";
import type { CancellationPolicyEnum, HostTypeEnum } from "@safe-sahel/types";

export type HostBadges = { verified: boolean; hostType: HostTypeEnum | null; founding: boolean };

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
  compoundId: string | null;
  compoundName: string | null;
  coverImageUrl: string | null;
  dayUseEnabled: boolean;
  monthlyRentalEnabled: boolean;
  rating: number | null;
  reviewCount: number;
  amenityPreview: string[];
  latitude: number | null;
  longitude: number | null;
  host: HostBadges;
  createdAt: string;
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
  monthlyRentalEnabled: boolean;
  monthlyPrice: number | null;
  minStayNights: number;
  calendarUpdatedAt: string | null;
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
  host: HostBadges;
};

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
  monthlyRental?: boolean;
  sort?: "price_asc" | "price_desc" | "rating" | "newest";
};

const LIST_COLUMNS =
  "id, slug, title, type, bedrooms, bathrooms, max_guests, price_per_night, verified, owner_id, compound_id, day_use_enabled, monthly_rental_enabled, view_type, created_at, latitude, longitude";

type ListRow = {
  id: string;
  slug: string;
  title: string;
  type: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  price_per_night: number;
  verified: boolean;
  owner_id: string;
  compound_id: string | null;
  day_use_enabled: boolean;
  monthly_rental_enabled: boolean;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
};

export async function getHostBadges(ownerIds: string[]): Promise<Map<string, HostBadges>> {
  if (ownerIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.rpc("host_badges", { p_owner_ids: [...new Set(ownerIds)] });
  return new Map(
    (data ?? []).map((b) => [
      b.owner_id,
      { verified: b.verified, hostType: b.host_type, founding: b.founding },
    ]),
  );
}

/** Property ids with a live Featured slot right now (paid, founder-free or admin). */
export async function getActiveFeaturedIds(): Promise<Set<string>> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("featured_slots")
    .select("property_id")
    .lte("starts_at", now)
    .gt("ends_at", now);
  return new Set((data ?? []).map((r) => r.property_id));
}

/**
 * Deliberately plain per-table queries instead of PostgREST embedded
 * selects — the hand-maintained types carry no Relationships metadata.
 */
async function enrich(rows: ListRow[]): Promise<PropertyListItem[]> {
  if (rows.length === 0) return [];
  const supabase = await createClient();
  const propertyIds = rows.map((p) => p.id);
  const compoundIds = [...new Set(rows.map((p) => p.compound_id).filter(Boolean))] as string[];

  const [
    { data: compounds },
    { data: coverImages },
    { data: reviews },
    { data: propertyAmenities },
    featured,
    badges,
  ] = await Promise.all([
    compoundIds.length > 0
      ? supabase
          .from("compounds")
          .select("id, name, name_ar, latitude, longitude")
          .in("id", compoundIds)
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            name_ar: string | null;
            latitude: number | null;
            longitude: number | null;
          }[],
        }),
    supabase
      .from("property_images")
      .select("property_id, url, is_cover, sort_order")
      .in("property_id", propertyIds),
    supabase.from("reviews").select("property_id, rating_overall").in("property_id", propertyIds),
    supabase
      .from("property_amenities")
      .select("property_id, amenity_id")
      .in("property_id", propertyIds),
    getActiveFeaturedIds(),
    getHostBadges(rows.map((r) => r.owner_id)),
  ]);

  const compoundById = new Map((compounds ?? []).map((c) => [c.id, c]));
  const coverByProperty = new Map<string, string>();
  for (const img of [...(coverImages ?? [])].sort(
    (a, b) => Number(b.is_cover) - Number(a.is_cover) || a.sort_order - b.sort_order,
  )) {
    if (!coverByProperty.has(img.property_id)) coverByProperty.set(img.property_id, img.url);
  }
  const ratingsByProperty = new Map<string, number[]>();
  for (const r of reviews ?? []) {
    const list = ratingsByProperty.get(r.property_id) ?? [];
    list.push(r.rating_overall);
    ratingsByProperty.set(r.property_id, list);
  }
  const amenityIds = [...new Set((propertyAmenities ?? []).map((pa) => pa.amenity_id))];
  const { data: amenityRows } =
    amenityIds.length > 0
      ? await supabase.from("amenities").select("id, name").in("id", amenityIds)
      : { data: [] as { id: string; name: string }[] };
  const amenityName = new Map((amenityRows ?? []).map((a) => [a.id, a.name]));
  const amenitiesByProperty = new Map<string, string[]>();
  for (const pa of propertyAmenities ?? []) {
    const name = amenityName.get(pa.amenity_id);
    if (!name) continue;
    const list = amenitiesByProperty.get(pa.property_id) ?? [];
    list.push(name);
    amenitiesByProperty.set(pa.property_id, list);
  }

  return rows.map((p) => {
    const ratings = ratingsByProperty.get(p.id) ?? [];
    const compound = p.compound_id ? compoundById.get(p.compound_id) : undefined;
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
      featured: featured.has(p.id),
      compoundId: p.compound_id,
      compoundName: compound?.name ?? null,
      coverImageUrl: coverByProperty.get(p.id) ?? null,
      dayUseEnabled: p.day_use_enabled,
      monthlyRentalEnabled: p.monthly_rental_enabled,
      rating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
      reviewCount: ratings.length,
      amenityPreview: (amenitiesByProperty.get(p.id) ?? []).slice(0, 3),
      latitude: p.latitude ?? compound?.latitude ?? null,
      longitude: p.longitude ?? compound?.longitude ?? null,
      host: badges.get(p.owner_id) ?? { verified: p.verified, hostType: null, founding: false },
      createdAt: p.created_at,
    };
  });
}

export async function getPublishedProperties(
  filters: PropertyFilters = {},
): Promise<PropertyListItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("properties")
    .select(LIST_COLUMNS)
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
  if (filters.monthlyRental) query = query.eq("monthly_rental_enabled", true);

  if (filters.location) {
    const needle = filters.location.toLowerCase();
    const { data: compounds } = await supabase.from("compounds").select("id, name, name_ar");
    const ids = (compounds ?? [])
      .filter(
        (c) =>
          c.name.toLowerCase().includes(needle) || (c.name_ar ?? "").includes(filters.location!),
      )
      .map((c) => c.id);
    if (ids.length === 0) return [];
    query = query.in("compound_id", ids);
  }

  if (filters.sort === "price_asc") query = query.order("price_per_night", { ascending: true });
  else if (filters.sort === "price_desc")
    query = query.order("price_per_night", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  const { data, error } = await query.limit(60);
  if (error) throw error;

  let results = await enrich((data ?? []) as ListRow[]);
  if (filters.sort === "rating") {
    results = [...results].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  } else if (!filters.sort || filters.sort === "newest") {
    // Featured listings (max 3 per compound) always come first.
    results = [...results].sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return results;
}

export async function getPropertiesByIds(ids: string[]): Promise<PropertyListItem[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .select(LIST_COLUMNS)
    .in("id", ids)
    .eq("status", "published")
    .is("deleted_at", null);
  if (error) throw error;
  return enrich((data ?? []) as ListRow[]);
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

  const [{ data: compound }, { data: images }, { data: propertyAmenities }, badges] =
    await Promise.all([
      property.compound_id
        ? supabase.from("compounds").select("name").eq("id", property.compound_id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("property_images")
        .select("url, is_cover")
        .eq("property_id", property.id)
        .order("sort_order", { ascending: true }),
      supabase.from("property_amenities").select("amenity_id").eq("property_id", property.id),
      getHostBadges([property.owner_id]),
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
    monthlyRentalEnabled: property.monthly_rental_enabled,
    monthlyPrice: property.monthly_price !== null ? Number(property.monthly_price) : null,
    minStayNights: property.min_stay_nights,
    calendarUpdatedAt: property.calendar_updated_at,
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
    host: badges.get(property.owner_id) ?? {
      verified: property.verified,
      hostType: null,
      founding: false,
    },
  };
}
