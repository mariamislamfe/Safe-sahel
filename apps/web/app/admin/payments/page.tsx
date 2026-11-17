import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { dateTime, money } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { hoursSince, profileMap, propertyMap } from "@/lib/queries/admin";
import { DocumentViewButton } from "@/components/document-view-button";
import { ReviewPayment } from "@/components/admin-actions";
import {
  AgeChip,
  Card,
  EmptyState,
  Field,
  PageHeader,
  Pill,
  Section,
  Table,
  Td,
  Th,
  Tr,
} from "@/components/admin/ui";

export default async function AdminPaymentsPage() {
  await requireSection("payments");
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].payments;
  const plans = ownerDict[locale].subscription;
  const c = common[locale];

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase.from("subscription_payments").select("*").eq("status", "pending").order("created_at"),
    supabase
      .from("subscription_payments")
      .select("*")
      .neq("status", "pending")
      .order("reviewed_at", { ascending: false })
      .limit(15),
  ]);
  const all = [...(pending ?? []), ...(recent ?? [])];
  const [owners, props] = await Promise.all([
    profileMap(all.map((p) => p.owner_id)),
    propertyMap(all.flatMap((p) => p.property_ids)),
  ]);

  const planName = (p: (typeof all)[number]) =>
    p.kind === "featured"
      ? plans.kindFeatured(p.featured_weeks ?? 1)
      : (plans.plans[p.plan ?? ""]?.name ?? p.plan);
  const listings = (p: (typeof all)[number]) =>
    p.property_ids.map((id) => props.get(id)?.title ?? "—").join("، ");

  return (
    <>
      <PageHeader title={t.title} description={t.hint} count={(pending ?? []).length} />

      {(pending ?? []).length === 0 ? (
        <EmptyState icon="card" title={t.empty} />
      ) : (
        <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
          {(pending ?? []).map((p) => {
            const h = hoursSince(p.created_at);
            const owner = owners.get(p.owner_id);
            return (
              <Card key={p.id}>
                <div className="flex flex-col gap-md">
                  <div className="flex items-start justify-between gap-sm">
                    <div className="flex flex-col">
                      <span className="font-display text-2xl font-bold tabular-nums">
                        {money(locale, p.amount_egp)}
                      </span>
                      <span className="text-sm text-ink-secondary">{planName(p)}</span>
                    </div>
                    <AgeChip hours={h} label={`${h}h`} />
                  </div>
                  <div className="flex flex-col gap-xs rounded-xl bg-surface-soft/70 p-md">
                    <Field label={t.owner}>
                      {owner?.name ?? "—"}{" "}
                      <span className="text-ink-secondary" dir="ltr">
                        {owner?.phone}
                      </span>
                    </Field>
                    <Field label={t.what}>{listings(p)}</Field>
                    <Field label={t.reference}>
                      <span className="font-mono font-semibold" dir="ltr">
                        {p.instapay_reference}
                      </span>
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-sm">
                    {p.proof_path ? (
                      <DocumentViewButton kind="payment_proof" id={p.id} label={t.proof} />
                    ) : (
                      <span />
                    )}
                    <ReviewPayment id={p.id} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {(recent ?? []).length > 0 && (
        <Section title={t.history}>
          <Table minWidth={680}>
            <thead>
              <tr>
                <Th>{t.owner}</Th>
                <Th>{t.what}</Th>
                <Th end>{t.amount}</Th>
                <Th>{""}</Th>
                <Th end>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {(recent ?? []).map((p) => (
                <Tr key={p.id}>
                  <Td className="font-medium">{owners.get(p.owner_id)?.name ?? "—"}</Td>
                  <Td>
                    {planName(p)}
                    <p className="text-xs text-ink-secondary">{listings(p)}</p>
                    {p.rejection_reason && (
                      <p className="text-xs text-red-700">{p.rejection_reason}</p>
                    )}
                  </Td>
                  <Td end className="tabular-nums">
                    {money(locale, p.amount_egp)}
                  </Td>
                  <Td>
                    <Pill tone={p.status === "approved" ? "success" : "danger"}>
                      {c.reviewStatus[p.status]}
                    </Pill>
                  </Td>
                  <Td end className="whitespace-nowrap text-xs text-ink-secondary">
                    {dateTime(locale, p.reviewed_at)}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </Section>
      )}
    </>
  );
}
