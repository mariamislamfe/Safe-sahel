import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompoundOptions, getAmenityOptions } from "@/lib/queries/owner";
import { PropertyForm } from "@/components/property-form";
import { getLocale } from "@/lib/locale";
import { listingFormDict } from "@/lib/i18n/listing-form";

export default async function NewPropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [compounds, amenities, locale] = await Promise.all([
    getCompoundOptions(),
    getAmenityOptions(),
    getLocale(),
  ]);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">{listingFormDict[locale].newTitle}</h1>
      <PropertyForm ownerId={user.id} compounds={compounds} amenities={amenities} />
    </div>
  );
}
