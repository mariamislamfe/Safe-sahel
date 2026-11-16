import type { BookingContact, BookingStatusEnum } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";

export type BookingDetail = {
  id: string;
  reference: string;
  propertyId: string;
  propertyTitle: string;
  propertySlug: string;
  ownerId: string;
  guestId: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  adultsCount: number;
  basePrice: number;
  depositAmount: number;
  totalAmount: number;
  status: BookingStatusEnum;
  guestNote: string | null;
  declineReason: string | null;
  cancelledBy: string | null;
  cancellationFee: number;
  expiresAt: string | null;
  createdAt: string;
};

export type GuestIdRecord = {
  id: string;
  guestFullName: string;
  createdAt: string;
  purgeAfter: string;
  purgedAt: string | null;
};

export type ChecklistItem = { key: string; ok: boolean | null; note?: string };
export type Checklist = {
  items: ChecklistItem[];
  notes: string | null;
  ownerConfirmedAt: string | null;
  guestConfirmedAt: string | null;
} | null;

/** RLS lets the guest, the property owner and admins read the row. */
export async function getBookingDetail(id: string): Promise<BookingDetail | null> {
  const supabase = await createClient();
  const { data: b } = await supabase.from("bookings").select("*").eq("id", id).maybeSingle();
  if (!b) return null;
  const { data: p } = await supabase
    .from("properties")
    .select("title, slug, owner_id")
    .eq("id", b.property_id)
    .maybeSingle();
  return {
    id: b.id,
    reference: b.reference,
    propertyId: b.property_id,
    propertyTitle: p?.title ?? "—",
    propertySlug: p?.slug ?? "",
    ownerId: p?.owner_id ?? "",
    guestId: b.guest_id,
    checkIn: b.check_in,
    checkOut: b.check_out,
    nights: b.nights,
    guestsCount: b.guests_count,
    adultsCount: b.adults_count ?? b.guests_count,
    basePrice: Number(b.base_price),
    depositAmount: Number(b.deposit_amount),
    totalAmount: Number(b.total_amount),
    status: b.status,
    guestNote: b.guest_note,
    declineReason: b.decline_reason,
    cancelledBy: b.cancelled_by,
    cancellationFee: Number(b.cancellation_fee_amount),
    expiresAt: b.expires_at,
    createdAt: b.created_at,
  };
}

export async function getBookingContact(id: string): Promise<BookingContact | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_booking_contact", { p_booking_id: id });
  return (data as BookingContact | null) ?? null;
}

export async function getGuestIds(bookingId: string): Promise<GuestIdRecord[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("booking_guest_ids")
    .select("id, guest_full_name, created_at, purge_after, purged_at")
    .eq("booking_id", bookingId)
    .order("created_at");
  return (data ?? []).map((r) => ({
    id: r.id,
    guestFullName: r.guest_full_name,
    createdAt: r.created_at,
    purgeAfter: r.purge_after,
    purgedAt: r.purged_at,
  }));
}

export async function getChecklist(bookingId: string): Promise<Checklist> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checkin_checklists")
    .select("items, notes, owner_confirmed_at, guest_confirmed_at")
    .eq("booking_id", bookingId)
    .maybeSingle();
  if (!data) return null;
  return {
    items: Array.isArray(data.items) ? (data.items as ChecklistItem[]) : [],
    notes: data.notes,
    ownerConfirmedAt: data.owner_confirmed_at,
    guestConfirmedAt: data.guest_confirmed_at,
  };
}

/** Pending requests older than 24h flip to expired — cheap, idempotent, run lazily on reads. */
export async function expireStaleBookings() {
  const supabase = await createClient();
  await supabase.rpc("expire_stale_bookings");
}
