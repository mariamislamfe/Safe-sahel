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
export type PropertyTypeEnum =
  | "chalet"
  | "villa"
  | "studio"
  // Legacy values (remapped by 0021, blocked by a check constraint).
  | "apartment"
  | "twin_house"
  | "town_house";
export type PropertyStatusEnum = "draft" | "pending_review" | "published" | "suspended";
export type ViewTypeEnum = "sea_view" | "lagoon_view" | "garden_view" | "street_view" | "no_view";
export type CancellationPolicyEnum = "flexible" | "moderate" | "strict";
export type BookingTypeEnum = "overnight" | "day_use";
/** `pending_payment` / `completed` are legacy values kept for old rows; new flow uses the rest. */
export type BookingStatusEnum =
  "pending" | "pending_payment" | "confirmed" | "cancelled" | "completed" | "declined" | "expired";
export type AvailabilityReasonEnum = "owner_blocked" | "pending_hold" | "booked";
export type VerificationStatusEnum = "pending" | "contacted" | "approved" | "rejected";
export type SubscriptionStatusEnum = "inactive" | "active";
export type HandoverStageEnum = "check_in" | "check_out";
export type HandoverStatusEnum =
  "pending" | "check_in_done" | "check_out_done" | "under_review" | "resolved";
export type HostTypeEnum = "owner" | "broker";
export type SubscriptionPlanEnum = "monthly" | "season" | "annual" | "student_winter";
export type PriceTierEnum = "launch" | "basic" | "premium" | "luxury";
export type ReviewStatusEnum = "pending" | "approved" | "rejected";
export type OwnershipProofTypeEnum = "compound_card" | "maintenance_bill";
export type DocumentKindEnum =
  "verification_id" | "verification_proof" | "broker_authorization" | "guest_id" | "payment_proof";

type ProfilesRow = {
  id: string;
  role: UserRoleEnum;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  username: string | null;
  verified: boolean;
  locale: string;
  legal_name: string | null;
  host_type: HostTypeEnum | null;
  host_since: string | null;
  verification_revoked_at: string | null;
  verification_revoked_reason: string | null;
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
  sahel_location: string | null;
  id_document_url: string;
  status: VerificationStatusEnum;
  admin_notes: string | null;
  kind: HostTypeEnum;
  ownership_proof_path: string | null;
  ownership_proof_type: OwnershipProofTypeEnum | null;
  rejection_reason: string | null;
  consent_at: string | null;
  consent_version: string | null;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
};
type VerificationRequestsInsert = {
  id?: string;
  profile_id: string;
  full_name: string;
  phone: string;
  sahel_location?: string | null;
  id_document_url: string;
  kind?: HostTypeEnum;
  ownership_proof_path?: string | null;
  ownership_proof_type?: OwnershipProofTypeEnum | null;
  consent_at?: string | null;
  consent_version?: string | null;
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
  name_ar: string | null;
  is_focus: boolean;
  focus_rank: number | null;
  hidden: boolean;
  merged_into: string | null;
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
  name_ar?: string | null;
  is_focus?: boolean;
  focus_rank?: number | null;
  hidden?: boolean;
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
  unit_address: string | null;
  monthly_rental_enabled: boolean;
  monthly_price: number | null;
  unpublished_reason: string | null;
  first_published_at: string | null;
  calendar_updated_at: string | null;
  flagged_for_review: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
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
  unit_address?: string | null;
  monthly_rental_enabled?: boolean;
  monthly_price?: number | null;
  unpublished_reason?: string | null;
  flagged_for_review?: boolean;
  flag_reason?: string | null;
  deleted_at?: string | null;
};

type PropertyImagesRow = {
  id: string;
  property_id: string;
  url: string;
  sort_order: number;
  is_cover: boolean;
  content_hash: string | null;
  created_at: string;
};
type PropertyImagesInsert = {
  id?: string;
  property_id: string;
  url: string;
  sort_order?: number;
  is_cover?: boolean;
  content_hash?: string | null;
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
  reference: string;
  adults_count: number | null;
  expires_at: string | null;
  confirmed_at: string | null;
  declined_at: string | null;
  expired_at: string | null;
  decline_reason: string | null;
  cancelled_by: "guest" | "owner" | "admin" | "system" | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at: string | null;
};
/** Bookings are created/changed only via RPCs (request_booking etc.); kept for typing completeness. */
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

// --- 0018: trust, subscriptions, ID security, analytics ----------------------

type SubscriptionPricesRow = {
  plan: SubscriptionPlanEnum | "featured_week";
  tier: PriceTierEnum;
  price_egp: number;
  updated_at: string;
};
type SubscriptionPricesInsert = {
  plan: SubscriptionPlanEnum | "featured_week";
  tier: PriceTierEnum;
  price_egp: number;
};

type BrokerAuthorizationsRow = {
  id: string;
  property_id: string;
  broker_id: string;
  document_path: string;
  owner_full_name: string;
  owner_phone: string | null;
  status: ReviewStatusEnum;
  rejection_reason: string | null;
  consent_at: string;
  consent_version: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};
type BrokerAuthorizationsInsert = {
  id?: string;
  property_id: string;
  broker_id: string;
  document_path: string;
  owner_full_name: string;
  owner_phone?: string | null;
  consent_at: string;
  consent_version: string;
};

type SubscriptionPaymentsRow = {
  id: string;
  owner_id: string;
  kind: "subscription" | "featured";
  plan: SubscriptionPlanEnum | null;
  property_ids: string[];
  featured_weeks: number | null;
  amount_egp: number;
  quoted_breakdown: unknown;
  instapay_reference: string;
  proof_path: string | null;
  status: ReviewStatusEnum;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type ListingSubscriptionsRow = {
  id: string;
  property_id: string;
  owner_id: string;
  plan: SubscriptionPlanEnum;
  tier: PriceTierEnum;
  price_egp: number;
  discount_pct: number;
  amount_egp: number;
  starts_at: string;
  ends_at: string;
  status: "active" | "cancelled";
  source: "payment" | "admin";
  payment_id: string | null;
  is_founder_rate: boolean;
  guarantee_extended_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

type FeaturedSlotsRow = {
  id: string;
  property_id: string;
  compound_id: string | null;
  starts_at: string;
  ends_at: string;
  source: "payment" | "founder_free" | "admin";
  payment_id: string | null;
  cancelled_at: string | null;
  created_at: string;
};

type NotificationsRow = {
  id: string;
  recipient_id: string;
  kind: string;
  payload: Record<string, unknown>;
  channel: "email" | "in_app";
  created_at: string;
  sent_at: string | null;
  send_error: string | null;
  read_at: string | null;
};

type OwnerStrikesRow = {
  id: string;
  owner_id: string;
  property_id: string | null;
  booking_id: string | null;
  reason: string;
  created_at: string;
  revoked_at: string | null;
  revoked_by: string | null;
  revoke_reason: string | null;
};

type ListingEventsRow = {
  id: number;
  property_id: string | null;
  compound_id: string | null;
  event: "view" | "whatsapp_click" | "booking_request" | "booking_confirmed" | "site_visit";
  session_id: string | null;
  user_id: string | null;
  booking_id: string | null;
  value_egp: number | null;
  created_at: string;
};

type CheckinChecklistsRow = {
  booking_id: string;
  items: unknown;
  notes: string | null;
  owner_confirmed_at: string | null;
  guest_confirmed_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

type BookingGuestIdsRow = {
  id: string;
  booking_id: string;
  uploaded_by: string;
  guest_full_name: string;
  storage_path: string | null;
  consent_at: string;
  consent_version: string;
  purge_after: string;
  purged_at: string | null;
  created_at: string;
};

type DocumentAccessLogRow = {
  id: number;
  accessor_id: string | null;
  accessor_role: string;
  document_kind: DocumentKindEnum;
  record_id: string;
  bucket: string;
  storage_path: string;
  subject_profile_id: string | null;
  booking_id: string | null;
  accessed_at: string;
};

type ListingDuplicateFlagsRow = {
  id: string;
  property_id: string;
  other_property_id: string;
  score: number;
  reasons: string[];
  status: "open" | "dismissed" | "confirmed";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

/** Admin dashboard sections a team member can be given (0019). */
export type AdminPermission =
  | "verification"
  | "listings"
  | "bookings"
  | "payments"
  | "reports"
  | "users"
  | "catalog"
  | "security";

export const ADMIN_PERMISSIONS: AdminPermission[] = [
  "verification",
  "listings",
  "bookings",
  "payments",
  "reports",
  "users",
  "catalog",
  "security",
];

type StaffMembersRow = {
  profile_id: string;
  title: string;
  permissions: AdminPermission[];
  active: boolean;
  added_by: string | null;
  created_at: string;
  updated_at: string;
  deactivated_at: string | null;
};

export type AdminAccess = {
  founder: boolean;
  title: string | null;
  permissions: AdminPermission[];
};

export type StaffListRow = {
  profile_id: string;
  email: string | null;
  full_name: string | null;
  title: string;
  permissions: AdminPermission[];
  active: boolean;
  created_at: string;
  deactivated_at: string | null;
};

type DataMigrationLogRow = {
  id: number;
  migration: string;
  entity: string;
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

/**
 * Tables written by SECURITY DEFINER RPCs. Insert is `never` (clients can't
 * insert); Update covers the few edits RLS allows (admin flags, read_at…).
 */
type RpcTable<Row> = {
  Row: Row;
  Insert: never;
  Update: Partial<Row>;
  Relationships: [];
};

export type QuoteLine = {
  property_id: string;
  title: string;
  nightly_price: number;
  tier: PriceTierEnum;
  list_price: number;
  discount_pct: number;
  amount: number;
  founder_rate: boolean;
  included_free: boolean;
};

export type BookingContact = {
  role: "guest" | "owner";
  status: BookingStatusEnum;
  reference: string;
  property_title?: string;
  owner_display_name?: string | null;
  owner_legal_name?: string | null;
  owner_phone?: string | null;
  owner_verified?: boolean;
  owner_host_type?: HostTypeEnum;
  guest_name?: string | null;
  guest_phone?: string | null;
};

export type GuaranteeStatusRow = {
  subscription_id: string;
  property_id: string;
  owner_id: string;
  starts_at: string;
  ends_at: string;
  window_ends_at: string;
  requests_in_window: number;
  status: "tracking" | "eligible" | "not_eligible" | "granted";
  granted_at: string | null;
};

export type ListingStatsRow = {
  property_id: string;
  views: number;
  whatsapp_clicks: number;
  booking_requests: number;
  confirmed_bookings: number;
  booking_value: number;
};

export type WeeklyKpiRow = {
  week_start: string;
  new_listings: number;
  verified_listings: number;
  site_visits: number;
  booking_requests: number;
  confirmed_bookings: number;
};

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfilesRow, ProfilesInsert>;
      compounds: Table<CompoundsRow, CompoundsInsert>;
      properties: Table<PropertiesRow, PropertiesInsert>;
      property_images: Table<PropertyImagesRow, PropertyImagesInsert>;
      amenities: Table<AmenitiesRow, AmenitiesInsert>;
      property_amenities: Table<PropertyAmenitiesRow, PropertyAmenitiesInsert>;
      property_inventory_categories: Table<
        PropertyInventoryCategoriesRow,
        PropertyInventoryCategoriesInsert
      >;
      property_inventory_items: Table<PropertyInventoryItemsRow, PropertyInventoryItemsInsert>;
      availability_blocks: Table<AvailabilityBlocksRow, AvailabilityBlocksInsert>;
      bookings: Table<BookingsRow, BookingsInsert>;
      platform_settings: Table<PlatformSettingsRow, PlatformSettingsInsert>;
      reviews: Table<ReviewsRow, ReviewsInsert>;
      favorites: Table<FavoritesRow, FavoritesInsert>;
      verification_requests: Table<VerificationRequestsRow, VerificationRequestsInsert>;
      subscription_codes: Table<SubscriptionCodesRow, SubscriptionCodesInsert>;
      conversations: Table<ConversationsRow, ConversationsInsert>;
      messages: Table<MessagesRow, MessagesInsert>;
      booking_handovers: Table<BookingHandoversRow, BookingHandoversInsert>;
      booking_handover_photos: Table<BookingHandoverPhotosRow, BookingHandoverPhotosInsert>;
      guest_reviews: Table<GuestReviewsRow, GuestReviewsInsert>;
      subscription_prices: Table<SubscriptionPricesRow, SubscriptionPricesInsert>;
      broker_authorizations: {
        Row: BrokerAuthorizationsRow;
        Insert: BrokerAuthorizationsInsert;
        Update: Partial<BrokerAuthorizationsRow>;
        Relationships: [];
      };
      subscription_payments: RpcTable<SubscriptionPaymentsRow>;
      listing_subscriptions: RpcTable<ListingSubscriptionsRow>;
      featured_slots: RpcTable<FeaturedSlotsRow>;
      notifications: RpcTable<NotificationsRow>;
      owner_strikes: RpcTable<OwnerStrikesRow>;
      listing_events: RpcTable<ListingEventsRow>;
      checkin_checklists: RpcTable<CheckinChecklistsRow>;
      booking_guest_ids: RpcTable<BookingGuestIdsRow>;
      document_access_log: RpcTable<DocumentAccessLogRow>;
      listing_duplicate_flags: RpcTable<ListingDuplicateFlagsRow>;
      data_migration_log: RpcTable<DataMigrationLogRow>;
      staff_members: RpcTable<StaffMembersRow>;
    };
    Views: Record<string, never>;
    Functions: {
      redeem_subscription_code: {
        Args: { p_property_id: string; p_code: string };
        Returns: boolean;
      };
      request_booking: {
        Args: {
          p_property_id: string;
          p_check_in: string;
          p_check_out: string;
          p_guests: number;
          p_adults?: number | null;
          p_note?: string | null;
        };
        Returns: { booking_id: string; reference: string }[];
      };
      respond_to_booking: {
        Args: { p_booking_id: string; p_decision: "confirm" | "decline"; p_note?: string | null };
        Returns: string;
      };
      cancel_booking: {
        Args: { p_booking_id: string; p_reason?: string | null };
        Returns: string;
      };
      expire_stale_bookings: { Args: Record<string, never>; Returns: number };
      get_booking_contact: { Args: { p_booking_id: string }; Returns: BookingContact | null };
      mark_calendar_reviewed: { Args: { p_property_id: string }; Returns: string };
      save_checkin_checklist: {
        Args: { p_booking_id: string; p_items: unknown; p_notes?: string | null };
        Returns: undefined;
      };
      confirm_checkin_checklist: { Args: { p_booking_id: string }; Returns: undefined };
      register_guest_id: {
        Args: {
          p_booking_id: string;
          p_storage_path: string;
          p_guest_full_name: string;
          p_consent_version: string;
        };
        Returns: string;
      };
      withdraw_guest_id: { Args: { p_id: string }; Returns: undefined };
      authorize_document_access: {
        Args: { p_kind: DocumentKindEnum; p_record_id: string };
        Returns: { bucket: string; storage_path: string }[];
      };
      review_verification: {
        Args: {
          p_request_id: string;
          p_approve: boolean;
          p_legal_name?: string | null;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      revoke_verification: {
        Args: { p_profile_id: string; p_reason: string };
        Returns: undefined;
      };
      review_broker_authorization: {
        Args: { p_id: string; p_approve: boolean; p_reason?: string | null };
        Returns: undefined;
      };
      quote_subscription: {
        Args: { p_property_ids: string[]; p_plan: SubscriptionPlanEnum };
        Returns: QuoteLine[];
      };
      submit_payment: {
        Args: {
          p_kind: "subscription" | "featured";
          p_plan: SubscriptionPlanEnum | null;
          p_property_ids: string[];
          p_weeks: number | null;
          p_reference: string;
          p_proof_path: string | null;
        };
        Returns: string;
      };
      approve_payment: { Args: { p_payment_id: string }; Returns: undefined };
      reject_payment: { Args: { p_payment_id: string; p_reason: string }; Returns: undefined };
      claim_founder_featured: { Args: { p_property_id: string }; Returns: string };
      admin_grant_featured: { Args: { p_property_id: string; p_days: number }; Returns: string };
      guarantee_status: { Args: Record<string, never>; Returns: GuaranteeStatusRow[] };
      grant_guarantee_month: { Args: { p_subscription_id: string }; Returns: undefined };
      property_publish_blockers: { Args: { p_property_id: string }; Returns: string[] | null };
      host_badges: {
        Args: { p_owner_ids: string[] };
        Returns: {
          owner_id: string;
          verified: boolean;
          host_type: HostTypeEnum | null;
          founding: boolean;
        }[];
      };
      is_founding_host: { Args: { p_profile_id: string }; Returns: boolean };
      broker_discount_pct: { Args: { p_owner_id: string }; Returns: number };
      track_listing_event: {
        Args: {
          p_event: "view" | "whatsapp_click" | "site_visit";
          p_property_id?: string | null;
          p_session_id?: string | null;
        };
        Returns: undefined;
      };
      owner_listing_stats: { Args: { p_from: string; p_to: string }; Returns: ListingStatsRow[] };
      admin_weekly_kpis: {
        Args: { p_weeks?: number; p_compound_id?: string | null };
        Returns: WeeklyKpiRow[];
      };
      run_daily_maintenance: { Args: Record<string, never>; Returns: Record<string, number> };
      enqueue_calendar_reminders: { Args: Record<string, never>; Returns: number };
      admin_moderate_listing: {
        Args: {
          p_property_id: string;
          p_action: "unpublish" | "suspend" | "restore" | "clear_flag";
          p_reason?: string | null;
        };
        Returns: undefined;
      };
      admin_review_duplicate: {
        Args: { p_flag_id: string; p_status: "dismissed" | "confirmed" };
        Returns: undefined;
      };
      admin_revoke_strike: { Args: { p_strike_id: string; p_reason: string }; Returns: undefined };
      admin_cancel_featured: { Args: { p_slot_id: string }; Returns: undefined };
      admin_set_compound_hidden: {
        Args: { p_compound_id: string; p_hidden: boolean };
        Returns: undefined;
      };
      my_admin_access: { Args: Record<string, never>; Returns: AdminAccess | null };
      admin_upsert_staff: {
        Args: { p_email: string; p_title: string; p_permissions: AdminPermission[] };
        Returns: string;
      };
      admin_set_staff_active: {
        Args: { p_profile_id: string; p_active: boolean };
        Returns: undefined;
      };
      admin_list_staff: { Args: Record<string, never>; Returns: StaffListRow[] };
      admin_delete_property: { Args: { p_property_id: string }; Returns: undefined };
      admin_delete_user: { Args: { p_profile_id: string }; Returns: undefined };
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
