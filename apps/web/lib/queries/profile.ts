import { createClient } from "@/lib/supabase/server";
import type { VerificationStatusEnum } from "@safe-sahel/types";

export type HostRatingSummary = {
  averageRating: number | null;
  reviewCount: number;
  recentReviews: { comment: string | null; ratingOverall: number; guestName: string | null }[];
};

/** Aggregate rating across every property this owner has — their "host rating". */
export async function getHostRatingSummary(ownerId: string): Promise<HostRatingSummary> {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id")
    .eq("owner_id", ownerId);
  const propertyIds = (properties ?? []).map((p) => p.id);
  if (propertyIds.length === 0) return { averageRating: null, reviewCount: 0, recentReviews: [] };

  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating_overall, comment, guest_id, created_at")
    .in("property_id", propertyIds)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0)
    return { averageRating: null, reviewCount: 0, recentReviews: [] };

  const { data: guests } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      reviews.map((r) => r.guest_id),
    );
  const nameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));

  return {
    averageRating: reviews.reduce((sum, r) => sum + r.rating_overall, 0) / reviews.length,
    reviewCount: reviews.length,
    recentReviews: reviews.slice(0, 6).map((r) => ({
      comment: r.comment,
      ratingOverall: r.rating_overall,
      guestName: nameById.get(r.guest_id) ?? null,
    })),
  };
}

export type GuestRatingSummary = {
  averageRating: number | null;
  reviewCount: number;
  recentReviews: { comment: string | null; rating: number; ownerName: string | null }[];
};

/** The other direction — how hosts have rated this guest across their stays. */
export async function getGuestRatingSummary(guestId: string): Promise<GuestRatingSummary> {
  const supabase = await createClient();

  const { data: reviews } = await supabase
    .from("guest_reviews")
    .select("rating, comment, owner_id, created_at")
    .eq("guest_id", guestId)
    .order("created_at", { ascending: false });

  if (!reviews || reviews.length === 0)
    return { averageRating: null, reviewCount: 0, recentReviews: [] };

  const { data: owners } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      reviews.map((r) => r.owner_id),
    );
  const nameById = new Map((owners ?? []).map((o) => [o.id, o.full_name]));

  return {
    averageRating: reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length,
    reviewCount: reviews.length,
    recentReviews: reviews.slice(0, 6).map((r) => ({
      comment: r.comment,
      rating: r.rating,
      ownerName: nameById.get(r.owner_id) ?? null,
    })),
  };
}

export type VerificationRequestSummary = {
  status: VerificationStatusEnum;
  createdAt: string;
} | null;

export async function getMyVerificationRequest(
  profileId: string,
): Promise<VerificationRequestSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("verification_requests")
    .select("status, created_at")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data ? { status: data.status, createdAt: data.created_at } : null;
}
