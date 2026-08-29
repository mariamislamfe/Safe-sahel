import { createClient } from "@/lib/supabase/server";
import { AdminAmenitiesManager } from "@/components/admin-amenities-manager";

export default async function AdminAmenitiesPage() {
  const supabase = await createClient();
  const { data: amenities } = await supabase
    .from("amenities")
    .select("id, name, category")
    .order("category");

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Amenities</h1>
      <AdminAmenitiesManager initialAmenities={amenities ?? []} />
    </div>
  );
}
