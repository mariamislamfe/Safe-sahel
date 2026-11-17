import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { requireSection } from "@/lib/admin-access";
import { AdminAmenitiesManager } from "@/components/admin-amenities-manager";
import { PageHeader } from "@/components/admin/ui";

export default async function AdminAmenitiesPage() {
  await requireSection("amenities");
  const supabase = await createClient();
  const t = adminShellDict[await getLocale()].catalog;
  const { data: amenities } = await supabase
    .from("amenities")
    .select("id, name, category")
    .order("category")
    .order("name");

  return (
    <>
      <PageHeader
        title={t.amenitiesTitle}
        description={t.amenitiesBody}
        count={(amenities ?? []).length}
      />
      <AdminAmenitiesManager initialAmenities={amenities ?? []} />
    </>
  );
}
