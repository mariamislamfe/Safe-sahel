import { cairoMonthRange } from "@safe-sahel/utils";
import type { HostTypeEnum, ListingStatsRow, PropertyStatusEnum } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";

export type OwnerProfile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  verified: boolean;
  legalName: string | null;
  hostType: HostTypeEnum | null;
  hostSince: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
  founding: boolean;
};

export async function getOwnerProfile(userId: string): Promise<OwnerProfile> {
  const supabase = await createClient();
  const [{ data: p }, { data: founding }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, phone, verified, legal_name, host_type, host_since, verification_revoked_at, verification_revoked_reason",
      )
      .eq("id", userId)
      .single(),
    supabase.rpc("is_founding_host", { p_profile_id: userId }),
  ]);
  return {
    id: userId,
    fullName: p?.full_name ?? null,
    phone: p?.phone ?? null,
    verified: p?.verified ?? false,
    legalName: p?.legal_name ?? null,
    hostType: p?.host_type ?? null,
    hostSince: p?.host_since ?? null,
    revokedAt: p?.verification_revoked_at ?? null,
    revokedReason: p?.verification_revoked_reason ?? null,
    founding: !!founding,
  };
}

export type OwnerListing = {
  id: string;
  title: string;
  slug: string;
  status: PropertyStatusEnum;
  pricePerNight: number;
  compoundId: string | null;
  coverImageUrl: string | null;
  photoCount: number;
  unpublishedReason: string | null;
  flagged: boolean;
  monthlyRental: boolean;
  calendarUpdatedAt: string | null;
};

export async function getOwnerListings(userId: string): Promise<OwnerListing[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("properties")
    .select(
      "id, title, slug, status, price_per_night, compound_id, unpublished_reason, flagged_for_review, monthly_rental_enabled, calendar_updated_at",
    )
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (!rows || rows.length === 0) return [];

  const { data: images } = await supabase
    .from("property_images")
    .select("property_id, url, is_cover")
    .in(
      "property_id",
      rows.map((r) => r.id),
    );
  const count = new Map<string, number>();
  const cover = new Map<string, string>();
  for (const img of images ?? []) {
    count.set(img.property_id, (count.get(img.property_id) ?? 0) + 1);
    if (img.is_cover || !cover.has(img.property_id)) cover.set(img.property_id, img.url);
  }
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    status: r.status,
    pricePerNight: Number(r.price_per_night),
    compoundId: r.compound_id,
    coverImageUrl: cover.get(r.id) ?? null,
    photoCount: count.get(r.id) ?? 0,
    unpublishedReason: r.unpublished_reason,
    flagged: r.flagged_for_review,
    monthlyRental: r.monthly_rental_enabled,
    calendarUpdatedAt: r.calendar_updated_at,
  }));
}

export type MonthlyReport = {
  from: string;
  totals: Omit<ListingStatsRow, "property_id">;
  previous: Omit<ListingStatsRow, "property_id">;
  byListing: ListingStatsRow[];
};

function sum(rows: ListingStatsRow[]) {
  return rows.reduce(
    (acc, r) => ({
      views: acc.views + r.views,
      whatsapp_clicks: acc.whatsapp_clicks + r.whatsapp_clicks,
      booking_requests: acc.booking_requests + r.booking_requests,
      confirmed_bookings: acc.confirmed_bookings + r.confirmed_bookings,
      booking_value: acc.booking_value + Number(r.booking_value),
    }),
    { views: 0, whatsapp_clicks: 0, booking_requests: 0, confirmed_bookings: 0, booking_value: 0 },
  );
}

/** This Cairo calendar month vs last month, from owner_listing_stats(). */
export async function getMonthlyReport(): Promise<MonthlyReport> {
  const supabase = await createClient();
  const now = cairoMonthRange();
  const prev = cairoMonthRange(new Date(), -1);
  const [{ data: current }, { data: previous }] = await Promise.all([
    supabase.rpc("owner_listing_stats", {
      p_from: now.from.toISOString(),
      p_to: now.to.toISOString(),
    }),
    supabase.rpc("owner_listing_stats", {
      p_from: prev.from.toISOString(),
      p_to: prev.to.toISOString(),
    }),
  ]);
  const byListing = (current ?? []).map((r) => ({ ...r, booking_value: Number(r.booking_value) }));
  return {
    from: now.from.toISOString(),
    totals: sum(byListing),
    previous: sum(previous ?? []),
    byListing,
  };
}

export async function getOwnerPendingCount(userId: string): Promise<number> {
  const supabase = await createClient();
  await supabase.rpc("expire_stale_bookings");
  const { data: props } = await supabase.from("properties").select("id").eq("owner_id", userId);
  if (!props || props.length === 0) return 0;
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")
    .in(
      "property_id",
      props.map((p) => p.id),
    );
  return count ?? 0;
}

export async function getOwnerStrikes(userId: string) {
  const supabase = await createClient();
  const { data: strikes } = await supabase
    .from("owner_strikes")
    .select("id, booking_id, reason, created_at, revoked_at")
    .eq("owner_id", userId)
    .order("created_at", { ascending: false });
  const bookingIds = (strikes ?? []).map((s) => s.booking_id).filter(Boolean) as string[];
  const { data: bookings } = bookingIds.length
    ? await supabase.from("bookings").select("id, reference").in("id", bookingIds)
    : { data: [] as { id: string; reference: string }[] };
  const refById = new Map((bookings ?? []).map((b) => [b.id, b.reference]));
  return (strikes ?? []).map((s) => ({
    id: s.id,
    reference: s.booking_id ? (refById.get(s.booking_id) ?? "—") : "—",
    reason: s.reason,
    createdAt: s.created_at,
    revoked: !!s.revoked_at,
  }));
}

export async function getMyNotifications(userId: string, limit = 8) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, payload, created_at, read_at")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getLatestVerification(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("id, kind, status, rejection_reason, created_at, reviewed_at")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function getPlatformSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  return (data?.value as T | undefined) ?? fallback;
}
