import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { BookingStatusEnum } from "@safe-sahel/types";

export type GuestBooking = {
  id: string;
  propertyId: string;
  propertyTitle: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalAmount: number;
  status: BookingStatusEnum;
  canReview: boolean;
};

export function useGuestBookings(guestId: string | undefined) {
  return useQuery({
    queryKey: ["bookings", "guest", guestId],
    enabled: !!guestId,
    queryFn: async (): Promise<GuestBooking[]> => {
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, property_id, check_in, check_out, guests_count, total_amount, status")
        .eq("guest_id", guestId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!bookings || bookings.length === 0) return [];

      const { data: properties } = await supabase
        .from("properties")
        .select("id, title")
        .in(
          "id",
          bookings.map((b) => b.property_id),
        );
      const titleById = new Map((properties ?? []).map((p) => [p.id, p.title]));

      const { data: reviewed } = await supabase
        .from("reviews")
        .select("booking_id")
        .in(
          "booking_id",
          bookings.map((b) => b.id),
        );
      const reviewedIds = new Set((reviewed ?? []).map((r) => r.booking_id));
      const today = new Date().toISOString().slice(0, 10);

      return bookings.map((b) => ({
        id: b.id,
        propertyId: b.property_id,
        propertyTitle: titleById.get(b.property_id) ?? "Property",
        checkIn: b.check_in,
        checkOut: b.check_out,
        guestsCount: b.guests_count,
        totalAmount: Number(b.total_amount),
        status: b.status,
        canReview: b.status === "confirmed" && b.check_out < today && !reviewedIds.has(b.id),
      }));
    },
  });
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      bookingId: string;
      propertyId: string;
      guestId: string;
      ratingOverall: number;
      comment: string;
    }) => {
      const { error } = await supabase.from("reviews").insert({
        booking_id: input.bookingId,
        property_id: input.propertyId,
        guest_id: input.guestId,
        rating_overall: input.ratingOverall,
        rating_cleanliness: input.ratingOverall,
        rating_accuracy: input.ratingOverall,
        rating_location: input.ratingOverall,
        rating_value: input.ratingOverall,
        comment: input.comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bookings"] }),
  });
}
