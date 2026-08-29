import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PropertyStatusEnum } from "@safe-sahel/types";

export type OwnerProperty = {
  id: string;
  title: string;
  status: PropertyStatusEnum;
  pricePerNight: number;
  coverImageUrl: string | null;
};

export function useOwnerProperties(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["owner", "properties", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<OwnerProperty[]> => {
      const { data: properties, error } = await supabase
        .from("properties")
        .select("id, title, status, price_per_night")
        .eq("owner_id", ownerId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!properties || properties.length === 0) return [];

      const { data: images } = await supabase
        .from("property_images")
        .select("property_id, url")
        .in(
          "property_id",
          properties.map((p) => p.id),
        )
        .eq("is_cover", true);
      const coverById = new Map((images ?? []).map((i) => [i.property_id, i.url]));

      return properties.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        pricePerNight: Number(p.price_per_night),
        coverImageUrl: coverById.get(p.id) ?? null,
      }));
    },
  });
}

export type OwnerBooking = {
  id: string;
  propertyTitle: string;
  guestName: string | null;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  status: string;
};

export function useOwnerBookings(ownerId: string | undefined) {
  return useQuery({
    queryKey: ["owner", "bookings", ownerId],
    enabled: !!ownerId,
    queryFn: async (): Promise<OwnerBooking[]> => {
      const { data: properties } = await supabase
        .from("properties")
        .select("id, title")
        .eq("owner_id", ownerId!);
      if (!properties || properties.length === 0) return [];
      const titleById = new Map(properties.map((p) => [p.id, p.title]));

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, property_id, guest_id, check_in, check_out, total_amount, status")
        .in(
          "property_id",
          properties.map((p) => p.id),
        )
        .order("created_at", { ascending: false });
      if (!bookings || bookings.length === 0) return [];

      const { data: guests } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in(
          "id",
          bookings.map((b) => b.guest_id),
        );
      const nameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));

      return bookings.map((b) => ({
        id: b.id,
        propertyTitle: titleById.get(b.property_id) ?? "Property",
        guestName: nameById.get(b.guest_id) ?? null,
        checkIn: b.check_in,
        checkOut: b.check_out,
        totalAmount: Number(b.total_amount),
        status: b.status,
      }));
    },
  });
}

export function useRespondToBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      bookingId,
      decision,
    }: {
      bookingId: string;
      decision: "confirmed" | "declined";
    }) => {
      await supabase.from("bookings").update({ status: decision }).eq("id", bookingId);
      if (decision === "confirmed") {
        await supabase
          .from("availability_blocks")
          .update({ reason: "booked" })
          .eq("booking_id", bookingId);
      } else {
        await supabase.from("availability_blocks").delete().eq("booking_id", bookingId);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["owner", "bookings"] }),
  });
}
