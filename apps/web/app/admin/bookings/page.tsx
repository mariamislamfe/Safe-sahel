import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { common } from "@/lib/i18n/common";
import { date, money } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { profileMap, propertyMap } from "@/lib/queries/admin";
import { BookingStatusBadge, ExpiryCountdown } from "@/components/booking-bits";
import { EmptyState, FilterTabs, PageHeader, Table, Td, Th, Tr } from "@/components/admin/ui";

const FILTERS = ["all", "pending", "confirmed", "closed"] as const;
const CLOSED = ["declined", "expired", "cancelled"];

export default async function AdminBookingsPage(props: PageProps<"/admin/bookings">) {
  await requireSection("bookings");
  const params = await props.searchParams;
  const filter = (FILTERS as readonly string[]).includes(String(params.f))
    ? String(params.f)
    : "all";
  const supabase = await createClient();
  await supabase.rpc("expire_stale_bookings");
  const locale = await getLocale();
  const t = adminShellDict[locale].bookings;

  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      "id, reference, property_id, guest_id, check_in, check_out, base_price, status, expires_at, cancelled_by",
    )
    .order("created_at", { ascending: false })
    .limit(300);
  const all = bookings ?? [];
  const match = (f: string, status: string) =>
    f === "all" ? true : f === "closed" ? CLOSED.includes(status) : status === f;
  const rows = all.filter((b) => match(filter, b.status));

  const [props_, guests] = await Promise.all([
    propertyMap(rows.map((b) => b.property_id)),
    profileMap(rows.map((b) => b.guest_id)),
  ]);

  return (
    <>
      <PageHeader title={t.title} description={t.body} count={all.length} />
      <FilterTabs
        items={FILTERS.map((f) => ({
          href: `/admin/bookings?f=${f}`,
          label: t.filters[f]!,
          active: filter === f,
          count: all.filter((b) => match(f, b.status)).length,
        }))}
      />
      {rows.length === 0 ? (
        <EmptyState icon="calendar" title={t.empty} body={common[locale].noResults} />
      ) : (
        <Table minWidth={780}>
          <thead>
            <tr>
              <Th>{t.ref}</Th>
              <Th>{t.listing}</Th>
              <Th>{t.guest}</Th>
              <Th>{t.dates}</Th>
              <Th end>{t.value}</Th>
              <Th>{t.status}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => (
              <Tr key={b.id}>
                <Td className="font-mono text-xs">{b.reference}</Td>
                <Td className="font-medium">{props_.get(b.property_id)?.title ?? "—"}</Td>
                <Td>
                  {guests.get(b.guest_id)?.name ?? "—"}
                  {guests.get(b.guest_id)?.phone && (
                    <p className="text-xs text-ink-secondary" dir="ltr">
                      {guests.get(b.guest_id)?.phone}
                    </p>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-ink-secondary">
                  {date(locale, b.check_in)} → {date(locale, b.check_out)}
                </Td>
                <Td end className="tabular-nums">
                  {money(locale, Number(b.base_price))}
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-1">
                    <BookingStatusBadge status={b.status} />
                    {b.status === "pending" && b.expires_at && (
                      <ExpiryCountdown expiresAt={b.expires_at} />
                    )}
                    {b.cancelled_by && (
                      <span className="text-xs text-ink-secondary">← {b.cancelled_by}</span>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
