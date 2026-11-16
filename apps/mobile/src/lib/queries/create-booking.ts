import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

/**
 * Sends a booking REQUEST via request_booking(): status "pending", dates are
 * only blocked once the owner confirms, and the price is computed in the
 * database (the price fields below are display-only and ignored).
 */
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
      const { data, error } = await supabase.rpc("request_booking", {
        p_property_id: input.propertyId,
        p_check_in: input.checkIn,
        p_check_out: input.checkOut,
        p_guests: input.guestsCount,
      });
      if (error || !data?.[0]) {
        const code = error?.message.match(/^([a-z_]+)/)?.[1];
        throw new Error(
          code === "dates_unavailable"
            ? "Those dates are already booked — try different dates."
            : code === "duplicate_request"
              ? "You already sent a request for these dates."
              : (error?.message ?? "Could not send the booking request."),
        );
      }
      return data[0].booking_id;
    },
  });
}
