import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { getPropertiesByIds } from "@/lib/queries/properties";
import { PropertyCard } from "@/components/property-card";
import { fromRealProperty } from "@/lib/display-property";
import { EmptyState, PageHeader } from "@/components/admin/ui";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/account/favorites");

  const t = dashboardDict[await getLocale()].account.favorites;
  const { data: favorites } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("guest_id", user.id);
  const properties = await getPropertiesByIds((favorites ?? []).map((f) => f.property_id));

  return (
    <>
      <PageHeader title={t.title} count={properties.length || undefined} />

      {properties.length === 0 ? (
        <div className="flex flex-col items-center gap-md">
          <EmptyState icon="heart" title={t.empty} body={t.emptyBody} />
          <Link
            href="/search"
            className="rounded-xl bg-turquoise px-xl py-sm text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            {t.browse}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={fromRealProperty(property)} />
          ))}
        </div>
      )}
    </>
  );
}
