import { createClient } from "@/lib/supabase/server";
import { AdminPropertyStatus } from "@/components/admin-property-status";
import { AdminFeaturedToggle } from "@/components/admin-featured-toggle";

export default async function AdminPropertiesPage() {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("id, title, status, owner_id, price_per_night, featured")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  const ownerIds = [...new Set((properties ?? []).map((p) => p.owner_id))];
  const { data: owners } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", ownerIds)
      : { data: [] as { id: string; full_name: string | null }[] };
  const ownerNameById = new Map((owners ?? []).map((o) => [o.id, o.full_name]));

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Properties</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-left text-ink-secondary">
            <tr>
              <th className="p-md">Title</th>
              <th className="p-md">Owner</th>
              <th className="p-md">Price</th>
              <th className="p-md">Status</th>
              <th className="p-md">Featured</th>
            </tr>
          </thead>
          <tbody>
            {(properties ?? []).map((property) => (
              <tr key={property.id} className="border-t border-border">
                <td className="p-md font-medium text-ink">{property.title}</td>
                <td className="p-md text-ink-secondary">
                  {ownerNameById.get(property.owner_id) ?? "—"}
                </td>
                <td className="p-md text-ink-secondary">{property.price_per_night} EGP</td>
                <td className="p-md">
                  <AdminPropertyStatus propertyId={property.id} status={property.status} />
                </td>
                <td className="p-md">
                  <AdminFeaturedToggle propertyId={property.id} featured={property.featured} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
