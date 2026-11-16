import { createClient } from "@/lib/supabase/server";

export type LocationSummary = {
  id: string;
  name: string;
  nameAr: string | null;
  area: string | null;
  coverImageUrl: string | null;
  propertyCount: number;
  isFocus: boolean;
  focusRank: number | null;
};

/**
 * Compounds (merged/hidden duplicates excluded) with a real count of their
 * live listings. Focus compounds first, in priority order; then the rest by
 * how many stays they have.
 */
export async function getLocations(): Promise<LocationSummary[]> {
  const supabase = await createClient();

  const { data: compounds } = await supabase
    .from("compounds")
    .select("id, name, name_ar, area, cover_image_url, is_focus, focus_rank, hidden")
    .eq("hidden", false)
    .order("name");
  if (!compounds || compounds.length === 0) return [];

  const { data: properties } = await supabase
    .from("properties")
    .select("compound_id")
    .eq("status", "published")
    .is("deleted_at", null)
    .in(
      "compound_id",
      compounds.map((c) => c.id),
    );

  const counts = new Map<string, number>();
  for (const p of properties ?? []) {
    if (p.compound_id) counts.set(p.compound_id, (counts.get(p.compound_id) ?? 0) + 1);
  }

  return compounds
    .map((c) => ({
      id: c.id,
      name: c.name,
      nameAr: c.name_ar,
      area: c.area,
      coverImageUrl: c.cover_image_url,
      propertyCount: counts.get(c.id) ?? 0,
      isFocus: c.is_focus,
      focusRank: c.focus_rank,
    }))
    .sort((a, b) => {
      if (a.isFocus !== b.isFocus) return a.isFocus ? -1 : 1;
      if (a.isFocus) return (a.focusRank ?? 99) - (b.focusRank ?? 99);
      return b.propertyCount - a.propertyCount || a.name.localeCompare(b.name);
    });
}

/** Homepage: the 5 focus compounds always (0 stays → "Coming soon"), others only once they have stays. */
export function homepageLocations(all: LocationSummary[]): LocationSummary[] {
  return all.filter((l) => l.isFocus || l.propertyCount > 0);
}
