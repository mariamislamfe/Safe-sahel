import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { common } from "@/lib/i18n/common";
import { date } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { hoursSince, profileMap, propertyMap } from "@/lib/queries/admin";
import { DocumentViewButton } from "@/components/document-view-button";
import { ReviewAuthorization, ReviewVerification } from "@/components/admin-actions";
import {
  AgeChip,
  Avatar,
  Card,
  EmptyState,
  PageHeader,
  Pill,
  Section,
  Table,
  Td,
  Tr,
} from "@/components/admin/ui";

const docBtn =
  "inline-flex items-center gap-xs rounded-lg border border-border bg-surface px-md py-2 text-sm font-medium hover:border-turquoise disabled:opacity-60";

export default async function AdminVerificationPage() {
  await requireSection("verification");
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].verification;
  const c = common[locale];

  const [{ data: requests }, { data: auths }, { data: recent }] = await Promise.all([
    supabase
      .from("verification_requests")
      .select(
        "id, profile_id, kind, full_name, phone, sahel_location, ownership_proof_path, ownership_proof_type, status, created_at",
      )
      .in("status", ["pending", "contacted"])
      .order("created_at"),
    supabase
      .from("broker_authorizations")
      .select("id, property_id, broker_id, owner_full_name, owner_phone, status, created_at")
      .eq("status", "pending")
      .order("created_at"),
    supabase
      .from("verification_requests")
      .select("id, full_name, kind, status, rejection_reason, reviewed_at")
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(10),
  ]);

  const [brokers, properties] = await Promise.all([
    profileMap((auths ?? []).map((a) => a.broker_id)),
    propertyMap((auths ?? []).map((a) => a.property_id)),
  ]);

  return (
    <>
      <PageHeader title={t.title} description={t.target} count={(requests ?? []).length} />

      <Section title={t.owners} count={(requests ?? []).length}>
        {(requests ?? []).length === 0 ? (
          <EmptyState icon="shield" title={t.empty} />
        ) : (
          <div className="flex flex-col gap-md">
            {(requests ?? []).map((r) => {
              const h = hoursSince(r.created_at);
              return (
                <Card key={r.id} tone={h >= 24 ? "danger" : "default"}>
                  <div className="grid gap-lg md:grid-cols-[1fr_300px]">
                    <div className="flex flex-col gap-md">
                      <div className="flex items-start gap-sm">
                        <Avatar name={r.full_name} />
                        <div className="flex min-w-0 flex-col gap-xs">
                          <div className="flex flex-wrap items-center gap-xs">
                            <p className="font-display font-semibold">{r.full_name}</p>
                            <Pill tone={r.kind === "broker" ? "info" : "neutral"}>
                              {t.kind[r.kind]}
                            </Pill>
                            <AgeChip hours={h} label={t.submittedAgo(h)} overdue={t.overdue} />
                          </div>
                          <p className="text-sm text-ink-secondary">
                            <span dir="ltr">{r.phone}</span>
                            {r.sahel_location && ` · ${r.sahel_location}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-sm">
                        <DocumentViewButton
                          kind="verification_id"
                          id={r.id}
                          label={t.id}
                          className={docBtn}
                        />
                        {r.ownership_proof_path && (
                          <DocumentViewButton
                            kind="verification_proof"
                            id={r.id}
                            className={docBtn}
                            label={`${t.proof}${r.ownership_proof_type ? ` · ${t.proofTypes[r.ownership_proof_type]}` : ""}`}
                          />
                        )}
                      </div>
                      <p className="text-xs text-ink-secondary">🔒 {c.documentNote}</p>
                    </div>
                    <div className="border-t border-border pt-md md:border-s md:border-t-0 md:ps-lg md:pt-0">
                      <ReviewVerification requestId={r.id} defaultName={r.full_name} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      <Section title={t.brokerAuth} count={(auths ?? []).length}>
        {(auths ?? []).length === 0 ? (
          <EmptyState icon="clipboard" title={t.empty} />
        ) : (
          <div className="flex flex-col gap-md">
            {(auths ?? []).map((a) => {
              const h = hoursSince(a.created_at);
              return (
                <Card key={a.id}>
                  <div className="flex flex-col gap-md md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-xs text-sm">
                      <div className="flex flex-wrap items-center gap-xs">
                        <span className="font-semibold">
                          {properties.get(a.property_id)?.title ?? "—"}
                        </span>
                        <AgeChip hours={h} label={t.submittedAgo(h)} overdue={t.overdue} />
                      </div>
                      <span className="text-ink-secondary">
                        {t.kind.broker}: {brokers.get(a.broker_id)?.name ?? "—"} · {t.ownerName}:{" "}
                        {a.owner_full_name}
                        {a.owner_phone && <span dir="ltr"> · {a.owner_phone}</span>}
                      </span>
                      <div>
                        <DocumentViewButton
                          kind="broker_authorization"
                          id={a.id}
                          label={t.authDoc}
                          className={docBtn}
                        />
                      </div>
                    </div>
                    <ReviewAuthorization id={a.id} />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {(recent ?? []).length > 0 && (
        <Section title={t.recent}>
          <Table minWidth={480}>
            <tbody>
              {(recent ?? []).map((r) => (
                <Tr key={r.id}>
                  <Td>
                    <span className="font-medium">{r.full_name}</span>
                    <span className="text-ink-secondary"> · {t.kind[r.kind]}</span>
                    {r.rejection_reason && (
                      <p className="text-xs text-red-700">{r.rejection_reason}</p>
                    )}
                  </Td>
                  <Td>
                    <Pill tone={r.status === "approved" ? "success" : "danger"}>
                      {c.reviewStatus[r.status]}
                    </Pill>
                  </Td>
                  <Td end className="whitespace-nowrap text-xs text-ink-secondary">
                    {date(locale, r.reviewed_at)}
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
