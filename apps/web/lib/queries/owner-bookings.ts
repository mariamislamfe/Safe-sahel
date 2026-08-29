import { createClient } from "@/lib/supabase/server";
import type { BookingStatusEnum } from "@safe-sahel/types";

export type OwnerBookingItem = {
  id: string;
  propertyId: string;
  guestId: string;
  propertyTitle: string;
  guestName: string | null;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalAmount: number;
  status: BookingStatusEnum;
};

export async function getOwnerBookings(ownerId: string): Promise<OwnerBookingItem[]> {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title")
    .eq("owner_id", ownerId);
  if (!properties || properties.length === 0) return [];

  const propertyTitleById = new Map(properties.map((p) => [p.id, p.title]));

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id, property_id, guest_id, check_in, check_out, guests_count, total_amount, status")
    .in(
      "property_id",
      properties.map((p) => p.id),
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!bookings || bookings.length === 0) return [];

  const { data: guests } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in(
      "id",
      bookings.map((b) => b.guest_id),
    );

  const guestNameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));

  return bookings.map((b) => ({
    id: b.id,
    propertyId: b.property_id,
    guestId: b.guest_id,
    propertyTitle: propertyTitleById.get(b.property_id) ?? "Property",
    guestName: guestNameById.get(b.guest_id) ?? null,
    checkIn: b.check_in,
    checkOut: b.check_out,
    guestsCount: b.guests_count,
    totalAmount: Number(b.total_amount),
    status: b.status,
  }));
}
