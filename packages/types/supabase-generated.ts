/**
 * Hand-maintained until the Supabase CLI is linked to a project — then
 * regenerate with `supabase gen types typescript` and this file becomes a
 * generated artifact instead. Keep it in sync with supabase/migrations/*.sql
 * until then.
 *
 * Each table's Row/Insert are standalone type aliases (not indexed off
 * `Database` itself) — self-referencing `Database` from inside its own
 * definition confused supabase-js's `extends GenericSchema` resolution and
 * silently degraded every query to `never`.
 */

export type UserRoleEnum = "guest" | "owner" | "admin";
export type PropertyTypeEnum = "chalet" | "villa" | "apartment" | "twin_house" | "town_house";
export type PropertyStatusEnum = "draft" | "pending_review" | "published" | "suspended";
export type ViewTypeEnum = "sea_view" | "lagoon_view" | "garden_view" | "street_view" | "no_view";
export type CancellationPolicyEnum = "flexible" | "moderate" | "strict";
export type BookingTypeEnum = "overnight" | "day_use";
export type BookingStatusEnum =
  "pending_payment" | "confirmed" | "cancelled" | "completed" | "declined";
export type AvailabilityReasonEnum = "owner_blocked" | "pending_hold" | "booked";
export type VerificationStatusEnum = "pending" | "contacted" | "approved" | "rejected";
export type SubscriptionStatusEnum = "inactive" | "active";
export type HandoverStageEnum = "check_in" | "check_out";
export type HandoverStatusEnum =
  "pending" | "check_in_done" | "check_out_done" | "under_review" | "resolved";

type ProfilesRow = {
  id: string;
  role: UserRoleEnum;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  username: string | null;
  verified: boolean;
  locale: string;
  created_at: string;
  updated_at: string;
};
type ProfilesInsert = {
  id: string;
  role?: UserRoleEnum;
  full_name?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  verified?: boolean;
  locale?: string;
};

type VerificationRequestsRow = {
  id: string;
  profile_id: string;
  full_name: string;
  phone: string;
  sahel_location: string;
  id_document_url: string;
  status: VerificationStatusEnum;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};
type VerificationRequestsInsert = {
  id?: string;
  profile_id: string;
  full_name: string;
  phone: string;
  sahel_location: string;
  id_document_url: string;
  status?: VerificationStatusEnum;
  admin_notes?: string | null;
  reviewed_at?: string | null;
};

type SubscriptionCodesRow = {
  id: string;
  code: string;
  created_by: string | null;
  used_by_property_id: string | null;
  used_at: string | null;
  created_at: string;
};
type SubscriptionCodesInsert = {
  id?: string;
  code: string;
  created_by?: string | null;
  used_by_property_id?: string | null;
  used_at?: string | null;
};

type ConversationsRow = {
  id: string;
  property_id: string | null;
  guest_id: string;
  owner_id: string;
  last_message_at: string;
  created_at: string;
};
type ConversationsInsert = {
  id?: string;
  property_id?: string | null;
  guest_id: string;
  owner_id: string;
};

type MessagesRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
type MessagesInsert = {
  id?: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at?: string | null;
};

type CompoundsRow = {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  description: string | null;
  cover_image_url: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  updated_at: string;
};
type CompoundsInsert = {
  id?: string;
  name: string;
  slug: string;
  area?: string | null;
  description?: string | null;
  cover_image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type PropertiesRow = {
  id: string;
  owner_id: string;
  compound_id: string | null;
  title: string;
  slug: string;
  type: PropertyTypeEnum;
  status: PropertyStatusEnum;
  description: string | null;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  floor: number | null;
  parking: boolean;
  beach_access: boolean;
  pool_access: boolean;
  distance_to_beach_m: number | null;
  view_type: ViewTypeEnum | null;
  price_per_night: number;
  day_use_enabled: boolean;
  day_use_price: number | null;
  min_stay_nights: number;
  verified: boolean;
  featured: boolean;
  latitude: number | null;
  longitude: number | null;
  subscription_status: SubscriptionStatusEnum;
  subscription_current_period_end: string | null;
  size_sqm: number | null;
  beds: number | null;
  check_in_instructions: string | null;
  village_entry_requirements: string | null;
  beach_access_details: string | null;
  pets_allowed: boolean;
  parties_allowed: boolean;
  smoking_allowed: boolean;
  commercial_photography_allowed: boolean;
  cancellation_policy: CancellationPolicyEnum;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};
type PropertiesInsert = {
  id?: string;
  owner_id: string;
  compound_id?: string | null;
  title: string;
  slug: string;
  type: PropertyTypeEnum;
  status?: PropertyStatusEnum;
  description?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  max_guests?: number;
  floor?: number | null;
  parking?: boolean;
  beach_access?: boolean;
  pool_access?: boolean;
  distance_to_beach_m?: number | null;
  view_type?: ViewTypeEnum | null;
  price_per_night: number;
  day_use_enabled?: boolean;
  day_use_price?: number | null;
  min_stay_nights?: number;
  latitude?: number | null;
  longitude?: number | null;
  featured?: boolean;
  size_sqm?: number | null;
  beds?: number | null;
  check_in_instructions?: string | null;
  village_entry_requirements?: string | null;
  beach_access_details?: string | null;
  pets_allowed?: boolean;
  parties_allowed?: boolean;
  smoking_allowed?: boolean;
  commercial_photography_allowed?: boolean;
  cancellation_policy?: CancellationPolicyEnum;
};

type PropertyImagesRow = {
  id: string;
  property_id: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
  created_at: string;
};
type PropertyImagesInsert = {
  id?: string;
  property_id: string;
  url: string;
  sort_order?: number;
  is_cover?: boolean;
};

type AmenitiesRow = {
  id: string;
  name: string;
  icon: string | null;
  category: string | null;
};
type AmenitiesInsert = {
  id?: string;
  name: string;
  icon?: string | null;
  category?: string | null;
};

type PropertyAmenitiesRow = {
  property_id: string;
  amenity_id: string;
};
type PropertyAmenitiesInsert = PropertyAmenitiesRow;

type PropertyInventoryCategoriesRow = {
  id: string;
  property_id: string;
  name: string;
  sort_order: number;
};
type PropertyInventoryCategoriesInsert = {
  id?: string;
  property_id: string;
  name: string;
  sort_order?: number;
};

type PropertyInventoryItemsRow = {
  id: string;
  category_id: string;
  name: string;
  quantity: number;
  notes: string | null;
  photo_url: string | null;
};
type PropertyInventoryItemsInsert = {
  id?: string;
  category_id: string;
  name: string;
  quantity?: number;
  notes?: string | null;
  photo_url?: string | null;
};

type AvailabilityBlocksRow = {
  id: string;
  property_id: string;
  range: string;
  reason: AvailabilityReasonEnum;
  booking_id: string | null;
  created_at: string;
};
type AvailabilityBlocksInsert = {
  id?: string;
  property_id: string;
  range: string;
  reason: AvailabilityReasonEnum;
  booking_id?: string | null;
};

type BookingsRow = {
  id: string;
  property_id: string;
  guest_id: string;
  booking_type: BookingTypeEnum;
  check_in: string;
  check_out: string;
  guests_count: number;
  nights: number;
  base_price: number;
  deposit_amount: number;
  total_amount: number;
  status: BookingStatusEnum;
  guest_note: string | null;
  owner_note: string | null;
  cancellation_fee_amount: number;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};
type BookingsInsert = {
  id?: string;
  property_id: string;
  guest_id: string;
  booking_type?: BookingTypeEnum;
  check_in: string;
  check_out: string;
  guests_count?: number;
  nights: number;
  base_price: number;
  deposit_amount?: number;
  total_amount: number;
  status?: BookingStatusEnum;
  guest_note?: string | null;
  owner_note?: string | null;
  cancellation_fee_amount?: number;
  cancelled_at?: string | null;
};

type PlatformSettingsRow = { key: string; value: unknown };
type PlatformSettingsInsert = PlatformSettingsRow;

type GuestReviewsRow = {
  id: string;
  booking_id: string;
  owner_id: string;
  guest_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};
type GuestReviewsInsert = {
  id?: string;
  booking_id: string;
  owner_id: string;
  guest_id: string;
  rating: number;
  comment?: string | null;
};

type BookingHandoversRow = {
  booking_id: string;
  status: HandoverStatusEnum;
  check_in_completed_at: string | null;
  check_out_completed_at: string | null;
  deduction_amount: number;
  deduction_reason: string | null;
  refund_amount: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
};
type BookingHandoversInsert = {
  booking_id: string;
  status?: HandoverStatusEnum;
  check_in_completed_at?: string | null;
  check_out_completed_at?: string | null;
  deduction_amount?: number;
  deduction_reason?: string | null;
  refund_amount?: number | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
};

type BookingHandoverPhotosRow = {
  id: string;
  booking_id: string;
  inventory_item_id: string;
  stage: HandoverStageEnum;
  url: string;
  created_at: string;
};
type BookingHandoverPhotosInsert = {
  id?: string;
  booking_id: string;
  inventory_item_id: string;
  stage: HandoverStageEnum;
  url: string;
};

type ReviewsRow = {
  id: string;
  booking_id: string;
  property_id: string;
  guest_id: string;
  rating_overall: number;
  rating_cleanliness: number;
  rating_accuracy: number;
  rating_location: number;
  rating_value: number;
  comment: string | null;
  created_at: string;
};
type ReviewsInsert = {
  id?: string;
  booking_id: string;
  property_id: string;
  guest_id: string;
  rating_overall: number;
  rating_cleanliness: number;
  rating_accuracy: number;
  rating_location: number;
  rating_value: number;
  comment?: string | null;
};

type FavoritesRow = { guest_id: string; property_id: string; created_at: string };
type FavoritesInsert = { guest_id: string; property_id: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfilesRow;
        Insert: ProfilesInsert;
        Update: Partial<ProfilesInsert>;
        Relationships: [];
      };
      compounds: {
        Row: CompoundsRow;
        Insert: CompoundsInsert;
        Update: Partial<CompoundsInsert>;
        Relationships: [];
      };
      properties: {
        Row: PropertiesRow;
        Insert: PropertiesInsert;
        Update: Partial<PropertiesInsert>;
        Relationships: [];
      };
      property_images: {
        Row: PropertyImagesRow;
        Insert: PropertyImagesInsert;
        Update: Partial<PropertyImagesInsert>;
        Relationships: [];
      };
      amenities: {
        Row: AmenitiesRow;
        Insert: AmenitiesInsert;
        Update: Partial<AmenitiesInsert>;
        Relationships: [];
      };
      property_amenities: {
        Row: PropertyAmenitiesRow;
        Insert: PropertyAmenitiesInsert;
        Update: Partial<PropertyAmenitiesInsert>;
        Relationships: [];
      };
      property_inventory_categories: {
        Row: PropertyInventoryCategoriesRow;
        Insert: PropertyInventoryCategoriesInsert;
        Update: Partial<PropertyInventoryCategoriesInsert>;
        Relationships: [];
      };
      property_inventory_items: {
        Row: PropertyInventoryItemsRow;
        Insert: PropertyInventoryItemsInsert;
        Update: Partial<PropertyInventoryItemsInsert>;
        Relationships: [];
      };
      availability_blocks: {
        Row: AvailabilityBlocksRow;
        Insert: AvailabilityBlocksInsert;
        Update: Partial<AvailabilityBlocksInsert>;
        Relationships: [];
      };
      bookings: {
        Row: BookingsRow;
        Insert: BookingsInsert;
        Update: Partial<BookingsInsert>;
        Relationships: [];
      };
      platform_settings: {
        Row: PlatformSettingsRow;
        Insert: PlatformSettingsInsert;
        Update: Partial<PlatformSettingsInsert>;
        Relationships: [];
      };
      reviews: {
        Row: ReviewsRow;
        Insert: ReviewsInsert;
        Update: Partial<ReviewsInsert>;
        Relationships: [];
      };
      favorites: {
        Row: FavoritesRow;
        Insert: FavoritesInsert;
        Update: Partial<FavoritesInsert>;
        Relationships: [];
      };
      verification_requests: {
        Row: VerificationRequestsRow;
        Insert: VerificationRequestsInsert;
        Update: Partial<VerificationRequestsInsert>;
        Relationships: [];
      };
      subscription_codes: {
        Row: SubscriptionCodesRow;
        Insert: SubscriptionCodesInsert;
        Update: Partial<SubscriptionCodesInsert>;
        Relationships: [];
      };
      conversations: {
        Row: ConversationsRow;
        Insert: ConversationsInsert;
        Update: Partial<ConversationsInsert>;
        Relationships: [];
      };
      messages: {
        Row: MessagesRow;
        Insert: MessagesInsert;
        Update: Partial<MessagesInsert>;
        Relationships: [];
      };
      booking_handovers: {
        Row: BookingHandoversRow;
        Insert: BookingHandoversInsert;
        Update: Partial<BookingHandoversInsert>;
        Relationships: [];
      };
      booking_handover_photos: {
        Row: BookingHandoverPhotosRow;
        Insert: BookingHandoverPhotosInsert;
        Update: Partial<BookingHandoverPhotosInsert>;
        Relationships: [];
      };
      guest_reviews: {
        Row: GuestReviewsRow;
        Insert: GuestReviewsInsert;
        Update: Partial<GuestReviewsInsert>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      redeem_subscription_code: {
        Args: { p_property_id: string; p_code: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRoleEnum;
      property_type: PropertyTypeEnum;
      property_status: PropertyStatusEnum;
      view_type: ViewTypeEnum;
      booking_type: BookingTypeEnum;
      booking_status: BookingStatusEnum;
      availability_reason: AvailabilityReasonEnum;
      verification_status: VerificationStatusEnum;
      subscription_status: SubscriptionStatusEnum;
      cancellation_policy: CancellationPolicyEnum;
      handover_stage: HandoverStageEnum;
      handover_status: HandoverStatusEnum;
    };
  };
};
