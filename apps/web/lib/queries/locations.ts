import { createClient } from "@/lib/supabase/server";

export type LocationSummary = {
  id: string;
  name: string;
  area: string | null;
  coverImageUrl: string | null;
  propertyCount: number;
};

/** Real compounds with a real count of their published properties — no placeholder numbers. */
export async function getLocations(): Promise<LocationSummary[]> {
  const supabase = await createClient();

  const { data: compounds } = await supabase
    .from("compounds")
    .select("id, name, area, cover_image_url")
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

  const countByCompoundId = new Map<string, number>();
  for (const p of properties ?? []) {
    if (!p.compound_id) continue;
    countByCompoundId.set(p.compound_id, (countByCompoundId.get(p.compound_id) ?? 0) + 1);
  }

  return compounds.map((c) => ({
    id: c.id,
    name: c.name,
    area: c.area,
    coverImageUrl: c.cover_image_url,
    propertyCount: countByCompoundId.get(c.id) ?? 0,
  }));
}
