import { createClient } from "@/lib/supabase/server";
import { getCoverImages } from "@/lib/queries/images";
import type { BookingStatusEnum } from "@safe-sahel/types";

export type OwnerBookingItem = {
  id: string;
  reference: string;
  propertyId: string;
  guestId: string;
  propertyTitle: string;
  coverImageUrl: string | null;
  guestName: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestsCount: number;
  adultsCount: number;
  basePrice: number;
  totalAmount: number;
  status: BookingStatusEnum;
  guestNote: string | null;
  expiresAt: string | null;
  createdAt: string;
  idsUploaded: number;
  checklistDone: boolean;
};

export async function getOwnerBookings(ownerId: string): Promise<OwnerBookingItem[]> {
  const supabase = await createClient();
  await supabase.rpc("expire_stale_bookings");

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title")
    .eq("owner_id", ownerId);
  if (!properties || properties.length === 0) return [];
  const titleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, reference, property_id, guest_id, check_in, check_out, nights, guests_count, adults_count, base_price, total_amount, status, guest_note, expires_at, created_at",
    )
    .in(
      "property_id",
      properties.map((p) => p.id),
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!bookings || bookings.length === 0) return [];

  const ids = bookings.map((b) => b.id);
  const [{ data: guests }, { data: guestIds }, { data: checklists }, covers] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [...new Set(bookings.map((b) => b.guest_id))]),
    supabase.from("booking_guest_ids").select("booking_id, purged_at").in("booking_id", ids),
    supabase
      .from("checkin_checklists")
      .select("booking_id, owner_confirmed_at, guest_confirmed_at")
      .in("booking_id", ids),
    getCoverImages(bookings.map((b) => b.property_id)),
  ]);
  const nameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));
  const idCount = new Map<string, number>();
  for (const g of guestIds ?? [])
    if (!g.purged_at) idCount.set(g.booking_id, (idCount.get(g.booking_id) ?? 0) + 1);
  const done = new Set(
    (checklists ?? [])
      .filter((c) => c.owner_confirmed_at && c.guest_confirmed_at)
      .map((c) => c.booking_id),
  );

  return bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    propertyId: b.property_id,
    guestId: b.guest_id,
    propertyTitle: titleById.get(b.property_id) ?? "—",
    coverImageUrl: covers.get(b.property_id) ?? null,
    guestName: nameById.get(b.guest_id) ?? null,
    checkIn: b.check_in,
    checkOut: b.check_out,
    nights: b.nights,
    guestsCount: b.guests_count,
    adultsCount: b.adults_count ?? b.guests_count,
    basePrice: Number(b.base_price),
    totalAmount: Number(b.total_amount),
    status: b.status,
    guestNote: b.guest_note,
    expiresAt: b.expires_at,
    createdAt: b.created_at,
    idsUploaded: idCount.get(b.id) ?? 0,
    checklistDone: done.has(b.id),
  }));
}
