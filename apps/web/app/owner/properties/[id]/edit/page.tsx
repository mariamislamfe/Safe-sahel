import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getCompoundOptions,
  getAmenityOptions,
  getOwnerPropertyById,
  getPropertyAmenityIds,
} from "@/lib/queries/owner";
import { getSubscriptionPriceEgp } from "@/lib/queries/availability";
import { PropertyForm } from "@/components/property-form";

export default async function EditPropertyPage(props: PageProps<"/owner/properties/[id]/edit">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [property, compounds, amenities, subscriptionPriceEgp] = await Promise.all([
    getOwnerPropertyById(id, user.id),
    getCompoundOptions(),
    getAmenityOptions(),
    getSubscriptionPriceEgp(),
  ]);

  if (!property) notFound();

  const amenityIds = await getPropertyAmenityIds(property.id);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">{property.title}</h1>
      <PropertyForm
        ownerId={user.id}
        compounds={compounds}
        amenities={amenities}
        existing={property}
        existingAmenityIds={amenityIds}
        subscriptionPriceEgp={subscriptionPriceEgp}
      />
    </div>
  );
}
