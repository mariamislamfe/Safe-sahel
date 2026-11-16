import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { dateTime } from "@/lib/i18n/format";
import { profileMap } from "@/lib/queries/admin";

const KIND: Record<string, { en: string; ar: string }> = {
  verification_id: { en: "Owner National ID", ar: "بطاقة مالك" },
  verification_proof: { en: "Ownership proof", ar: "إثبات ملكية" },
  broker_authorization: { en: "Broker authorization", ar: "تفويض وسيط" },
  guest_id: { en: "Guest National ID", ar: "بطاقة ضيف" },
  payment_proof: { en: "Payment proof", ar: "إثبات دفع" },
};

export default async function AdminAccessLogPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].accessLog;
  const { data: rows } = await supabase
    .from("document_access_log")
    .select("*")
    .order("accessed_at", { ascending: false })
    .limit(300);
  const people = await profileMap(
    (rows ?? []).flatMap((r) => [r.accessor_id, r.subject_profile_id]),
  );
  const bookingIds = [
    ...new Set((rows ?? []).map((r) => r.booking_id).filter(Boolean) as string[]),
  ];
  const { data: bookings } = bookingIds.length
    ? await supabase.from("bookings").select("id, reference").in("id", bookingIds)
    : { data: [] as { id: string; reference: string }[] };
  const ref = new Map((bookings ?? []).map((b) => [b.id, b.reference]));

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.body}</p>
      </div>
      {(rows ?? []).length === 0 ? (
        <p className="text-sm text-ink-secondary">{t.empty}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-soft text-ink-secondary">
              <tr>
                <th className="p-md text-start font-medium">{t.when}</th>
                <th className="p-md text-start font-medium">{t.who}</th>
                <th className="p-md text-start font-medium">{t.role}</th>
                <th className="p-md text-start font-medium">{t.kind}</th>
                <th className="p-md text-start font-medium">{t.subject}</th>
                <th className="p-md text-start font-medium">{t.booking}</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="whitespace-nowrap p-md">{dateTime(locale, r.accessed_at)}</td>
                  <td className="p-md">
                    {r.accessor_id
                      ? (people.get(r.accessor_id)?.name ?? r.accessor_id.slice(0, 8))
                      : "—"}
                  </td>
                  <td className="p-md">{r.accessor_role}</td>
                  <td className="p-md">{KIND[r.document_kind]?.[locale] ?? r.document_kind}</td>
                  <td className="p-md">
                    {r.subject_profile_id ? (people.get(r.subject_profile_id)?.name ?? "—") : "—"}
                  </td>
                  <td className="p-md font-mono text-xs">
                    {r.booking_id ? (ref.get(r.booking_id) ?? "—") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
