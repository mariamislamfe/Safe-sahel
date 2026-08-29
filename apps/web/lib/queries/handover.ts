import { createClient } from "@/lib/supabase/server";
import type { HandoverStageEnum, HandoverStatusEnum } from "@safe-sahel/types";
import type { InventoryCategory } from "@/lib/queries/owner";

export type HandoverPhoto = {
  id: string;
  inventoryItemId: string;
  stage: HandoverStageEnum;
  url: string;
};

export type HandoverDetail = {
  bookingId: string;
  propertyId: string;
  propertyTitle: string;
  ownerId: string;
  guestId: string;
  guestName: string | null;
  depositAmount: number;
  status: HandoverStatusEnum;
  deductionAmount: number;
  deductionReason: string | null;
  refundAmount: number | null;
  reviewedAt: string | null;
  photos: HandoverPhoto[];
  inventory: InventoryCategory[];
};

export async function getHandoverDetail(bookingId: string): Promise<HandoverDetail | null> {
  const supabase = await createClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, property_id, guest_id, deposit_amount")
    .eq("id", bookingId)
    .maybeSingle();
  if (!booking) return null;

  const [{ data: property }, { data: guest }, { data: handover }, { data: photos }, { data: categories }] =
    await Promise.all([
      supabase.from("properties").select("id, owner_id, title").eq("id", booking.property_id).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", booking.guest_id).maybeSingle(),
      supabase
        .from("booking_handovers")
        .select("status, deduction_amount, deduction_reason, refund_amount, reviewed_at")
        .eq("booking_id", bookingId)
        .maybeSingle(),
      supabase
        .from("booking_handover_photos")
        .select("id, inventory_item_id, stage, url")
        .eq("booking_id", bookingId),
      supabase
        .from("property_inventory_categories")
        .select("id, name")
        .eq("property_id", booking.property_id)
        .order("sort_order"),
    ]);

  if (!property) return null;

  const { data: items } =
    categories && categories.length > 0
      ? await supabase
          .from("property_inventory_items")
          .select("id, name, quantity, category_id, photo_url")
          .in(
            "category_id",
            categories.map((c) => c.id),
          )
      : {
          data: [] as {
            id: string;
            name: string;
            quantity: number;
            category_id: string;
            photo_url: string | null;
          }[],
        };

  return {
    bookingId: booking.id,
    propertyId: booking.property_id,
    propertyTitle: property.title,
    ownerId: property.owner_id,
    guestId: booking.guest_id,
    guestName: guest?.full_name ?? null,
    depositAmount: Number(booking.deposit_amount),
    status: handover?.status ?? "pending",
    deductionAmount: handover ? Number(handover.deduction_amount) : 0,
    deductionReason: handover?.deduction_reason ?? null,
    refundAmount: handover?.refund_amount !== undefined && handover?.refund_amount !== null
      ? Number(handover.refund_amount)
      : null,
    reviewedAt: handover?.reviewed_at ?? null,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      inventoryItemId: p.inventory_item_id,
      stage: p.stage,
      url: p.url,
    })),
    inventory: (categories ?? []).map((category) => ({
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
    })),
  };
}

export type UnderReviewHandover = {
  bookingId: string;
  propertyTitle: string;
  guestName: string | null;
  checkOutCompletedAt: string | null;
};

export async function getHandoversUnderReview(): Promise<UnderReviewHandover[]> {
  const supabase = await createClient();

  const { data: handovers } = await supabase
    .from("booking_handovers")
    .select("booking_id, check_out_completed_at")
    .eq("status", "under_review")
    .order("check_out_completed_at", { ascending: true });

  if (!handovers || handovers.length === 0) return [];

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, property_id, guest_id")
    .in(
      "id",
      handovers.map((h) => h.booking_id),
    );

  const propertyIds = [...new Set((bookings ?? []).map((b) => b.property_id))];
  const guestIds = [...new Set((bookings ?? []).map((b) => b.guest_id))];

  const [{ data: properties }, { data: guests }] = await Promise.all([
    supabase.from("properties").select("id, title").in("id", propertyIds),
    supabase.from("profiles").select("id, full_name").in("id", guestIds),
  ]);

  const propertyTitleById = new Map((properties ?? []).map((p) => [p.id, p.title]));
  const guestNameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));
  const bookingById = new Map((bookings ?? []).map((b) => [b.id, b]));

  return handovers.map((h) => {
    const booking = bookingById.get(h.booking_id);
    return {
      bookingId: h.booking_id,
      propertyTitle: booking ? (propertyTitleById.get(booking.property_id) ?? "Property") : "Property",
      guestName: booking ? (guestNameById.get(booking.guest_id) ?? null) : null,
      checkOutCompletedAt: h.check_out_completed_at,
    };
  });
}
