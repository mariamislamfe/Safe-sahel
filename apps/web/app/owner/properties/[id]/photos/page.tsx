import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnerPropertyById, getPropertyImages } from "@/lib/queries/owner";
import { PropertyPhotoUploader } from "@/components/property-photo-uploader";

export default async function PropertyPhotosPage(
  props: PageProps<"/owner/properties/[id]/photos">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const property = await getOwnerPropertyById(id, user.id);
  if (!property) notFound();

  const images = await getPropertyImages(property.id);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Photos — {property.title}</h1>
      <PropertyPhotoUploader propertyId={property.id} ownerId={user.id} initialImages={images} />
    </div>
  );
}
