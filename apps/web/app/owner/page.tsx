import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getOwnerProperties } from "@/lib/queries/owner";

const statusStyles: Record<string, string> = {
  draft: "bg-surface-soft text-ink-secondary",
  pending_review: "bg-butter-soft text-ink",
  published: "bg-turquoise-light text-turquoise-dark",
  suspended: "bg-red-50 text-red-700",
};

export default async function OwnerDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const properties = await getOwnerProperties(user.id);

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Your properties</h1>
        <Link
          href="/owner/properties/new"
          className="rounded-md bg-turquoise px-lg py-sm font-medium text-white hover:bg-turquoise-dark"
        >
          Add property
        </Link>
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border p-4xl text-center">
          <p className="font-medium text-ink">No properties yet</p>
          <p className="max-w-sm text-sm text-ink-secondary">
            Add your first chalet or villa to start receiving bookings.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link
              key={property.id}
              href={`/owner/properties/${property.id}/edit`}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface hover:shadow-md"
            >
              <div className="relative aspect-[4/3] w-full bg-surface-soft">
                {property.coverImageUrl ? (
                  <Image
                    src={property.coverImageUrl}
                    alt={property.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-ink-secondary">
                    No photo yet
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-xs p-md">
                <div className="flex items-center justify-between gap-sm">
                  <p className="font-display font-semibold text-ink">{property.title}</p>
                  <span
                    className={`rounded-full px-sm py-xs text-xs font-medium capitalize ${statusStyles[property.status]}`}
                  >
                    {property.status.replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-ink-secondary">
                  {formatEgp(property.pricePerNight)} / night
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
