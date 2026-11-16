import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { getOwnerListings } from "@/lib/queries/owner-dashboard";
import { OwnerCalendar, type CalendarBlock } from "@/components/owner-calendar";

function parseRange(raw: string) {
  const m = raw.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
  return m ? { start: m[1]!, end: m[2]! } : null;
}

export default async function OwnerCalendarPage(props: PageProps<"/owner/calendar">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].calendar;
  const listings = await getOwnerListings(user.id);
  const params = await props.searchParams;
  const selectedId =
    (typeof params.p === "string" && listings.some((l) => l.id === params.p)
      ? params.p
      : listings[0]?.id) ?? null;
  const selected = listings.find((l) => l.id === selectedId);

  let blocks: CalendarBlock[] = [];
  if (selected) {
    const { data } = await supabase
      .from("availability_blocks")
      .select("id, range, reason, booking_id")
      .eq("property_id", selected.id);
    const bookingIds = (data ?? []).map((b) => b.booking_id).filter(Boolean) as string[];
    const { data: refs } = bookingIds.length
      ? await supabase.from("bookings").select("id, reference").in("id", bookingIds)
      : { data: [] as { id: string; reference: string }[] };
    const refById = new Map((refs ?? []).map((r) => [r.id, r.reference]));
    blocks = (data ?? [])
      .map((b) => {
        const r = parseRange(b.range);
        return r
          ? {
              id: b.id,
              ...r,
              reason: b.reason,
              reference: b.booking_id ? refById.get(b.booking_id) : null,
            }
          : null;
      })
      .filter((b): b is CalendarBlock => b !== null)
      .sort((a, b) => a.start.localeCompare(b.start));
  }

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.intro}</p>
      </div>

      {listings.length === 0 ? (
        <p className="text-sm text-ink-secondary">{t.noListings}</p>
      ) : (
        <>
          {listings.length > 1 && (
            <div className="-mx-lg flex gap-sm overflow-x-auto px-lg">
              {listings.map((l) => (
                <Link
                  key={l.id}
                  href={`/owner/calendar?p=${l.id}`}
                  className={`shrink-0 rounded-full border px-md py-xs text-sm ${
                    l.id === selectedId
                      ? "border-turquoise bg-turquoise-light text-turquoise-dark"
                      : "border-border text-ink-secondary"
                  }`}
                >
                  {l.title}
                </Link>
              ))}
            </div>
          )}
          {selected && (
            <OwnerCalendar
              key={selected.id}
              propertyId={selected.id}
              blocks={blocks}
              lastUpdated={selected.calendarUpdatedAt}
            />
          )}
        </>
      )}
    </div>
  );
}
