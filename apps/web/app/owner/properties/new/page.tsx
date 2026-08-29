import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompoundOptions, getAmenityOptions } from "@/lib/queries/owner";
import { getSubscriptionPriceEgp } from "@/lib/queries/availability";
import { PropertyForm } from "@/components/property-form";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [compounds, amenities, subscriptionPriceEgp] = await Promise.all([
    getCompoundOptions(),
    getAmenityOptions(),
    getSubscriptionPriceEgp(),
  ]);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Add a property</h1>
      <PropertyForm
        ownerId={user.id}
        compounds={compounds}
        amenities={amenities}
        subscriptionPriceEgp={subscriptionPriceEgp}
      />
    </div>
  );
}
