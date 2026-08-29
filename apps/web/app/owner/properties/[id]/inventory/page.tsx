import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOwnerPropertyById, getPropertyInventory } from "@/lib/queries/owner";
import { PropertyInventoryManager } from "@/components/property-inventory-manager";

export default async function PropertyInventoryPage(
  props: PageProps<"/owner/properties/[id]/inventory">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const property = await getOwnerPropertyById(id, user.id);
  if (!property) notFound();

  const categories = await getPropertyInventory(property.id);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Inventory — {property.title}</h1>
      <PropertyInventoryManager
        ownerId={user.id}
        propertyId={property.id}
        initialCategories={categories}
      />
    </div>
  );
}
