import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCompoundOptions, getAmenityOptions } from "@/lib/queries/owner";
import { PropertyForm } from "@/components/property-form";
import { PageHeader } from "@/components/admin/ui";
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
    <div className="flex max-w-3xl flex-col gap-lg">
      <PageHeader title={listingFormDict[locale].newTitle} />
      <PropertyForm ownerId={user.id} compounds={compounds} amenities={amenities} />
    </div>
  );
}
