import { createClient } from "@/lib/supabase/server";

/** property_id → cover photo URL (the flagged cover, else the first photo). */
export async function getCoverImages(propertyIds: string[]): Promise<Map<string, string>> {
  const cover = new Map<string, string>();
  const ids = [...new Set(propertyIds)];
  if (ids.length === 0) return cover;
  const supabase = await createClient();
  const { data } = await supabase
    .from("property_images")
    .select("property_id, url, is_cover")
    .in("property_id", ids);
  for (const img of data ?? [])
    if (img.is_cover || !cover.has(img.property_id)) cover.set(img.property_id, img.url);
  return cover;
}
