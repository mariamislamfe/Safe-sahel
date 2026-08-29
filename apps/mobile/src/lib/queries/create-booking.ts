import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useCreateBooking() {
  return useMutation({
    mutationFn: async (input: {
      propertyId: string;
      guestId: string;
      checkIn: string;
      checkOut: string;
      guestsCount: number;
      nights: number;
      basePrice: number;
      depositAmount: number;
      totalAmount: number;
    }) => {
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .insert({
          property_id: input.propertyId,
          guest_id: input.guestId,
          check_in: input.checkIn,
          check_out: input.checkOut,
          guests_count: input.guestsCount,
          nights: input.nights,
          base_price: input.basePrice,
          deposit_amount: input.depositAmount,
          total_amount: input.totalAmount,
        })
        .select("id")
        .single();

      if (bookingError || !booking) throw bookingError ?? new Error("Could not create booking");

      const { error: blockError } = await supabase.from("availability_blocks").insert({
        property_id: input.propertyId,
        range: `[${input.checkIn},${input.checkOut})`,
        reason: "pending_hold",
        booking_id: booking.id,
      });

      if (blockError) {
        await supabase.from("bookings").delete().eq("id", booking.id);
        throw new Error("Those dates were just booked by someone else — try different dates.");
      }

      return booking.id as string;
    },
  });
}
