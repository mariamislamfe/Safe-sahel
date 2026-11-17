import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { dateTime } from "@/lib/i18n/format";
import { profileMap } from "@/lib/queries/admin";
import { requireSection } from "@/lib/admin-access";
import { EmptyState, PageHeader, Pill, Table, Td, Th, Tr } from "@/components/admin/ui";

const KIND: Record<string, { en: string; ar: string }> = {
  verification_id: { en: "Owner National ID", ar: "بطاقة مالك" },
  verification_proof: { en: "Ownership proof", ar: "إثبات ملكية" },
  broker_authorization: { en: "Broker authorization", ar: "تفويض وسيط" },
  guest_id: { en: "Guest National ID", ar: "بطاقة ضيف" },
  payment_proof: { en: "Payment proof", ar: "إثبات دفع" },
};

export default async function AdminAccessLogPage() {
  await requireSection("accessLog");
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

  const ROLE_TONE: Record<string, "info" | "success" | "neutral" | "warn"> = {
    admin: "info",
    staff: "warn",
    owner: "success",
    self: "neutral",
  };

  return (
    <>
      <PageHeader title={t.title} description={t.body} count={(rows ?? []).length} />
      {(rows ?? []).length === 0 ? (
        <EmptyState icon="eye" title={t.empty} />
      ) : (
        <Table minWidth={760}>
          <thead>
            <tr>
              <Th>{t.when}</Th>
              <Th>{t.who}</Th>
              <Th>{t.role}</Th>
              <Th>{t.kind}</Th>
              <Th>{t.subject}</Th>
              <Th>{t.booking}</Th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <Tr key={r.id}>
                <Td className="whitespace-nowrap text-ink-secondary">
                  {dateTime(locale, r.accessed_at)}
                </Td>
                <Td className="font-medium">
                  {r.accessor_id
                    ? (people.get(r.accessor_id)?.name ?? r.accessor_id.slice(0, 8))
                    : "—"}
                </Td>
                <Td>
                  <Pill tone={ROLE_TONE[r.accessor_role] ?? "neutral"}>{r.accessor_role}</Pill>
                </Td>
                <Td>{KIND[r.document_kind]?.[locale] ?? r.document_kind}</Td>
                <Td>
                  {r.subject_profile_id ? (people.get(r.subject_profile_id)?.name ?? "—") : "—"}
                </Td>
                <Td className="font-mono text-xs">
                  {r.booking_id ? (ref.get(r.booking_id) ?? "—") : "—"}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
