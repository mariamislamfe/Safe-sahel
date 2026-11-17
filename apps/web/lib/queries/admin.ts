import { cache } from "react";
import type { AdminAccess, AdminPermission } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";

/** id → display info for a set of profiles (admin RLS can read all). */
export async function profileMap(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0)
    return new Map<
      string,
      { name: string; phone: string | null; verified: boolean; hostType: string | null }
    >();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, legal_name, phone, verified, host_type")
    .in("id", unique);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      {
        name: p.legal_name ?? p.full_name ?? "—",
        phone: p.phone,
        verified: p.verified,
        hostType: p.host_type,
      },
    ]),
  );
}

export async function propertyMap(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0)
    return new Map<
      string,
      { title: string; ownerId: string; compoundId: string | null; status: string }
    >();
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, title, owner_id, compound_id, status")
    .in("id", unique);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      { title: p.title, ownerId: p.owner_id, compoundId: p.compound_id, status: p.status },
    ]),
  );
}

export async function compoundList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compounds")
    .select("id, name, name_ar, is_focus, focus_rank")
    .eq("hidden", false)
    .order("name");
  return (data ?? []).sort((a, b) =>
    a.is_focus !== b.is_focus
      ? a.is_focus
        ? -1
        : 1
      : (a.focus_rank ?? 99) - (b.focus_rank ?? 99) || a.name.localeCompare(b.name),
  );
}

export function hoursSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
}

export type QueueCounts = {
  verifications: number;
  verificationOverdue: boolean;
  oldestVerificationHours: number | null;
  authorizations: number;
  payments: number;
  flagged: number;
  duplicates: number;
  pendingBookings: number;
  expiring: number;
};

/** Work waiting in each queue — only for the sections this person can see. */
export const getQueueCounts = cache(async (access: AdminAccess | null): Promise<QueueCounts> => {
  const supabase = await createClient();
  const can = (p: AdminPermission) =>
    !!access && (access.founder || access.permissions.includes(p));
  const none = Promise.resolve({ data: null, count: 0 });
  const head = { count: "exact" as const, head: true };
  const now = new Date();
  const in7 = new Date(now.getTime() + 7 * 86_400_000).toISOString();

  const [ver, auth, pay, flagged, dups, bookings, expiring] = await Promise.all([
    can("verification")
      ? supabase
          .from("verification_requests")
          .select("created_at")
          .in("status", ["pending", "contacted"])
          .order("created_at")
      : none,
    can("verification")
      ? supabase.from("broker_authorizations").select("*", head).eq("status", "pending")
      : none,
    can("payments")
      ? supabase.from("subscription_payments").select("*", head).eq("status", "pending")
      : none,
    can("listings")
      ? supabase
          .from("properties")
          .select("*", head)
          .eq("flagged_for_review", true)
          .is("deleted_at", null)
      : none,
    can("listings")
      ? supabase.from("listing_duplicate_flags").select("*", head).eq("status", "open")
      : none,
    can("bookings") ? supabase.from("bookings").select("*", head).eq("status", "pending") : none,
    can("payments")
      ? supabase
          .from("listing_subscriptions")
          .select("*", head)
          .eq("status", "active")
          .gt("ends_at", now.toISOString())
          .lte("ends_at", in7)
      : none,
  ]);

  const verRows = (ver.data ?? []) as { created_at: string }[];
  const oldest = verRows[0]?.created_at;
  const oldestH = oldest ? hoursSince(oldest) : null;
  return {
    verifications: verRows.length,
    verificationOverdue: (oldestH ?? 0) >= 24,
    oldestVerificationHours: oldestH,
    authorizations: auth.count ?? 0,
    payments: pay.count ?? 0,
    flagged: flagged.count ?? 0,
    duplicates: dups.count ?? 0,
    pendingBookings: bookings.count ?? 0,
    expiring: expiring.count ?? 0,
  };
});
