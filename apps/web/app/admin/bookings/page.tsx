import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { date, money } from "@/lib/i18n/format";
import { profileMap, propertyMap } from "@/lib/queries/admin";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";

export default async function AdminBookingsPage() {
  const supabase = await createClient();
  await supabase.rpc("expire_stale_bookings");
  const locale = await getLocale();
  const t = adminDict[locale].nav;
  const o = ownerDict[locale].bookings;
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, reference, property_id, guest_id, check_in, check_out, base_price, status, expires_at, cancelled_by",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const [props, guests] = await Promise.all([
    propertyMap((bookings ?? []).map((b) => b.property_id)),
    profileMap((bookings ?? []).map((b) => b.guest_id)),
  ]);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">{t.bookings}</h1>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <tbody>
            {(bookings ?? []).map((b) => (
              <tr key={b.id} className="border-t border-border first:border-t-0">
                <td className="p-md font-mono text-xs">{b.reference}</td>
                <td className="p-md font-medium">{props.get(b.property_id)?.title ?? "—"}</td>
                <td className="p-md text-ink-secondary">
                  {o.guest}: {guests.get(b.guest_id)?.name ?? "—"}
                </td>
                <td className="whitespace-nowrap p-md text-ink-secondary">
                  {date(locale, b.check_in)} → {date(locale, b.check_out)}
                </td>
                <td className="p-md tabular-nums">{money(locale, Number(b.base_price))}</td>
                <td className="p-md">
                  <div className="flex flex-col items-start gap-xs">
                    <BookingStatusBadge status={b.status} />
                    {b.status === "pending" && b.expires_at && (
                      <ExpiryCountdown expiresAt={b.expires_at} />
                    )}
                    {b.cancelled_by && (
                      <span className="text-xs text-ink-secondary">← {b.cancelled_by}</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
