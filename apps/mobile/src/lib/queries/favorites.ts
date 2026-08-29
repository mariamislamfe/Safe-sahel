import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PropertyListItem } from "./properties";

async function fetchFavorites(guestId: string): Promise<PropertyListItem[]> {
  const { data: favorites } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("guest_id", guestId);
  const propertyIds = (favorites ?? []).map((f) => f.property_id);
  if (propertyIds.length === 0) return [];

  const { data: rows } = await supabase
    .from("properties")
    .select(
      "id, title, type, bedrooms, bathrooms, max_guests, price_per_night, verified, compound_id, day_use_enabled",
    )
    .in("id", propertyIds);

  const compoundIds = [
    ...new Set((rows ?? []).map((r) => r.compound_id).filter(Boolean)),
  ] as string[];
  const { data: compounds } =
    compoundIds.length > 0
      ? await supabase.from("compounds").select("id, name").in("id", compoundIds)
      : { data: [] as { id: string; name: string }[] };
  const compoundNameById = new Map((compounds ?? []).map((c) => [c.id, c.name]));

  const { data: images } = await supabase
    .from("property_images")
    .select("property_id, url")
    .in("property_id", propertyIds)
    .eq("is_cover", true);
  const coverById = new Map((images ?? []).map((i) => [i.property_id, i.url]));

  return (rows ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    maxGuests: p.max_guests,
    pricePerNight: Number(p.price_per_night),
    verified: p.verified,
    compoundName: p.compound_id ? (compoundNameById.get(p.compound_id) ?? null) : null,
    coverImageUrl: coverById.get(p.id) ?? null,
    dayUseEnabled: p.day_use_enabled,
  }));
}

export function useFavorites(guestId: string | undefined) {
  return useQuery({
    queryKey: ["favorites", guestId],
    queryFn: () => fetchFavorites(guestId!),
    enabled: !!guestId,
  });
}

export function useIsFavorite(guestId: string | undefined, propertyId: string) {
  return useQuery({
    queryKey: ["favorites", guestId, propertyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("favorites")
        .select("property_id")
        .eq("guest_id", guestId!)
        .eq("property_id", propertyId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!guestId,
  });
}

export function useToggleFavorite(guestId: string | undefined, propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (nextIsFavorite: boolean) => {
      if (!guestId) return;
      if (nextIsFavorite) {
        await supabase.from("favorites").insert({ guest_id: guestId, property_id: propertyId });
      } else {
        await supabase
          .from("favorites")
          .delete()
          .eq("guest_id", guestId)
          .eq("property_id", propertyId);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
    },
  });
}
