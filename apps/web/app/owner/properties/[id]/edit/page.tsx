import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCompoundOptions,
  getAmenityOptions,
  getOwnerPropertyById,
  getPropertyAmenityIds,
} from "@/lib/queries/owner";
import { PropertyForm } from "@/components/property-form";
import { PageHeader } from "@/components/admin/ui";

export default async function EditPropertyPage(props: PageProps<"/owner/properties/[id]/edit">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [property, compounds, amenities] = await Promise.all([
    getOwnerPropertyById(id, user.id),
    getCompoundOptions(),
    getAmenityOptions(),
  ]);

  if (!property) notFound();

  const amenityIds = await getPropertyAmenityIds(property.id);

  return (
    <div className="flex max-w-3xl flex-col gap-lg">
      <PageHeader title={property.title} />
      <PropertyForm
        ownerId={user.id}
        compounds={compounds}
        amenities={amenities}
        existing={property}
        existingAmenityIds={amenityIds}
      />
    </div>
  );
}
