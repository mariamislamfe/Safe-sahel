import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-butter-soft text-ink",
  confirmed: "bg-turquoise-light text-turquoise-dark",
  declined: "bg-red-50 text-red-700",
  cancelled: "bg-surface-soft text-ink-secondary",
  completed: "bg-surface-soft text-ink-secondary",
};

export default async function AdminBookingsPage() {
  const supabase = await createClient();
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, property_id, guest_id, check_in, check_out, total_amount, status")
    .order("created_at", { ascending: false })
    .limit(100);

  const propertyIds = [...new Set((bookings ?? []).map((b) => b.property_id))];
  const guestIds = [...new Set((bookings ?? []).map((b) => b.guest_id))];

  const [{ data: properties }, { data: guests }] = await Promise.all([
    propertyIds.length > 0
      ? supabase.from("properties").select("id, title").in("id", propertyIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
    guestIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", guestIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ]);

  const propertyTitleById = new Map((properties ?? []).map((p) => [p.id, p.title]));
  const guestNameById = new Map((guests ?? []).map((g) => [g.id, g.full_name]));

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Bookings</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-left text-ink-secondary">
            <tr>
              <th className="p-md">Property</th>
              <th className="p-md">Guest</th>
              <th className="p-md">Dates</th>
              <th className="p-md">Total</th>
              <th className="p-md">Status</th>
            </tr>
          </thead>
          <tbody>
            {(bookings ?? []).map((booking) => (
              <tr key={booking.id} className="border-t border-border">
                <td className="p-md font-medium text-ink">
                  {propertyTitleById.get(booking.property_id) ?? "—"}
                </td>
                <td className="p-md text-ink-secondary">
                  {guestNameById.get(booking.guest_id) ?? "—"}
                </td>
                <td className="p-md text-ink-secondary">
                  {booking.check_in} → {booking.check_out}
                </td>
                <td className="p-md text-ink-secondary">
                  {formatEgp(Number(booking.total_amount))}
                </td>
                <td className="p-md">
                  <span
                    className={`rounded-full px-sm py-xs text-xs font-medium capitalize ${statusStyles[booking.status]}`}
                  >
                    {booking.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
