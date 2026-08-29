import { createClient } from "@/lib/supabase/server";
import type {
  CancellationPolicyEnum,
  PropertyStatusEnum,
  PropertyTypeEnum,
  SubscriptionStatusEnum,
  ViewTypeEnum,
} from "@safe-sahel/types";

export type OwnerPropertyListItem = {
  id: string;
  title: string;
  slug: string;
  status: PropertyStatusEnum;
  pricePerNight: number;
  coverImageUrl: string | null;
};

export async function getOwnerProperties(ownerId: string): Promise<OwnerPropertyListItem[]> {
  const supabase = await createClient();

  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, title, slug, status, price_per_night")
    .eq("owner_id", ownerId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!properties || properties.length === 0) return [];

  const { data: images } = await supabase
    .from("property_images")
    .select("property_id, url")
    .in(
      "property_id",
      properties.map((p) => p.id),
    )
    .eq("is_cover", true);

  const coverByPropertyId = new Map((images ?? []).map((img) => [img.property_id, img.url]));

  return properties.map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    pricePerNight: Number(p.price_per_night),
    coverImageUrl: coverByPropertyId.get(p.id) ?? null,
  }));
}

export type OwnerPropertyFull = {
  id: string;
  ownerId: string;
  title: string;
  slug: string;
  type: PropertyTypeEnum;
  status: PropertyStatusEnum;
  description: string | null;
  compoundId: string | null;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  floor: number | null;
  parking: boolean;
  beachAccess: boolean;
  poolAccess: boolean;
  viewType: ViewTypeEnum | null;
  pricePerNight: number;
  dayUseEnabled: boolean;
  dayUsePrice: number | null;
  minStayNights: number;
  subscriptionStatus: SubscriptionStatusEnum;
  subscriptionCurrentPeriodEnd: string | null;
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

export async function getOwnerPropertyById(
  id: string,
  ownerId: string,
): Promise<OwnerPropertyFull | null> {
  const supabase = await createClient();

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .maybeSingle();

  if (error) throw error;
  if (!property) return null;

  return {
    id: property.id,
    ownerId: property.owner_id,
    title: property.title,
    slug: property.slug,
    type: property.type,
    status: property.status,
    description: property.description,
    compoundId: property.compound_id,
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    maxGuests: property.max_guests,
    floor: property.floor,
    parking: property.parking,
    beachAccess: property.beach_access,
    poolAccess: property.pool_access,
    viewType: property.view_type,
    pricePerNight: Number(property.price_per_night),
    dayUseEnabled: property.day_use_enabled,
    dayUsePrice: property.day_use_price !== null ? Number(property.day_use_price) : null,
    minStayNights: property.min_stay_nights,
    subscriptionStatus: property.subscription_status,
    subscriptionCurrentPeriodEnd: property.subscription_current_period_end,
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

export async function getCompoundOptions(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("compounds").select("id, name").order("name");
  return data ?? [];
}

export async function getAmenityOptions(): Promise<
  { id: string; name: string; category: string | null }[]
> {
  const supabase = await createClient();
  const { data } = await supabase.from("amenities").select("id, name, category").order("category");
  return data ?? [];
}

export async function getPropertyAmenityIds(propertyId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_amenities")
    .select("amenity_id")
    .eq("property_id", propertyId);
  return (data ?? []).map((row) => row.amenity_id);
}

export type InventoryItem = { id: string; name: string; quantity: number; photoUrl: string | null };
export type InventoryCategory = { id: string; name: string; items: InventoryItem[] };

export async function getPropertyInventory(propertyId: string): Promise<InventoryCategory[]> {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("property_inventory_categories")
    .select("id, name")
    .eq("property_id", propertyId)
    .order("sort_order");

  if (!categories || categories.length === 0) return [];

  const { data: items } = await supabase
    .from("property_inventory_items")
    .select("id, name, quantity, category_id, photo_url")
    .in(
      "category_id",
      categories.map((c) => c.id),
    );

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    items: (items ?? [])
      .filter((item) => item.category_id === category.id)
      .map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        photoUrl: item.photo_url,
      })),
  }));
}

export async function getPropertyImages(
  propertyId: string,
): Promise<{ id: string; url: string; isCover: boolean }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_images")
    .select("id, url, is_cover")
    .eq("property_id", propertyId)
    .order("sort_order");
  return (data ?? []).map((img) => ({ id: img.id, url: img.url, isCover: img.is_cover }));
}
