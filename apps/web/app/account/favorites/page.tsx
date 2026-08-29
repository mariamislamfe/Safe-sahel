import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPropertiesByIds } from "@/lib/queries/properties";
import { PropertyCard, fromRealProperty } from "@/components/property-card";

export default async function FavoritesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: favorites } = await supabase
    .from("favorites")
    .select("property_id")
    .eq("guest_id", user.id);
  const properties = await getPropertiesByIds((favorites ?? []).map((f) => f.property_id));

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-xl px-lg py-2xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Favorites</h1>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center gap-md rounded-2xl border border-dashed border-border px-lg py-5xl text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-surface-soft text-2xl text-ink-secondary">
            ♡
          </div>
          <p className="font-display text-lg font-semibold text-ink">No favorites yet</p>
          <p className="max-w-sm text-sm text-ink-secondary">
            Tap the heart on any property to save it here for later.
          </p>
          <Link
            href="/search"
            className="mt-sm rounded-full bg-turquoise px-xl py-sm text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            Browse stays
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-lg sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={fromRealProperty(property)} />
          ))}
        </div>
      )}
    </main>
  );
}
