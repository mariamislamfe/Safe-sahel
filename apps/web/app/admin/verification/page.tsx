import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { common } from "@/lib/i18n/common";
import { date } from "@/lib/i18n/format";
import { hoursSince, profileMap, propertyMap } from "@/lib/queries/admin";
import { DocumentViewButton } from "@/components/document-view-button";
import { ReviewAuthorization, ReviewVerification } from "@/components/admin-actions";

function Age({
  iso,
  label,
  overdue,
}: {
  iso: string;
  label: (h: number) => string;
  overdue: string;
}) {
  const h = hoursSince(iso);
  return (
    <span
      className={`rounded-full px-sm py-0.5 text-xs font-semibold ${h >= 24 ? "bg-red-100 text-red-700" : h >= 12 ? "bg-butter-soft text-ink" : "bg-turquoise-light text-turquoise-dark"}`}
    >
      ⏱ {label(h)}
      {h >= 24 && ` · ${overdue}`}
    </span>
  );
}

export default async function AdminVerificationPage() {
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
    <div className="flex flex-col gap-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.target}</p>
      </div>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">
          {t.owners} ({requests?.length ?? 0})
        </h2>
        {(requests ?? []).length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.empty}</p>
        ) : (
          (requests ?? []).map((r) => (
            <div
              key={r.id}
              className="flex flex-col gap-md rounded-2xl border border-border p-lg md:flex-row md:justify-between"
            >
              <div className="flex flex-col gap-xs">
                <div className="flex flex-wrap items-center gap-sm">
                  <p className="font-display font-semibold">{r.full_name}</p>
                  <span className="rounded-full bg-surface-soft px-sm py-0.5 text-xs">
                    {t.kind[r.kind]}
                  </span>
                  <Age iso={r.created_at} label={t.submittedAgo} overdue={t.overdue} />
                </div>
                <p className="text-sm text-ink-secondary" dir="ltr">
                  {r.phone}
                  {r.sahel_location && ` · ${r.sahel_location}`}
                </p>
                <div className="flex flex-wrap gap-sm">
                  <DocumentViewButton kind="verification_id" id={r.id} label={t.id} />
                  {r.ownership_proof_path && (
                    <DocumentViewButton
                      kind="verification_proof"
                      id={r.id}
                      label={`${t.proof}${r.ownership_proof_type ? ` · ${t.proofTypes[r.ownership_proof_type]}` : ""}`}
                    />
                  )}
                </div>
                <p className="text-xs text-ink-secondary">{c.documentNote}</p>
              </div>
              <div className="md:w-72">
                <ReviewVerification requestId={r.id} defaultName={r.full_name} />
              </div>
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">
          {t.brokerAuth} ({auths?.length ?? 0})
        </h2>
        {(auths ?? []).length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.empty}</p>
        ) : (
          (auths ?? []).map((a) => (
            <div
              key={a.id}
              className="flex flex-col gap-sm rounded-2xl border border-border p-lg md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-col gap-xs text-sm">
                <div className="flex flex-wrap items-center gap-sm">
                  <span className="font-semibold">
                    {properties.get(a.property_id)?.title ?? "—"}
                  </span>
                  <Age iso={a.created_at} label={t.submittedAgo} overdue={t.overdue} />
                </div>
                <span className="text-ink-secondary">
                  {t.kind.broker}: {brokers.get(a.broker_id)?.name ?? "—"} · {t.ownerName}:{" "}
                  {a.owner_full_name}
                  {a.owner_phone && <span dir="ltr"> · {a.owner_phone}</span>}
                </span>
                <DocumentViewButton kind="broker_authorization" id={a.id} label={t.authDoc} />
              </div>
              <ReviewAuthorization id={a.id} />
            </div>
          ))
        )}
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="font-display text-lg font-semibold">{t.recent}</h2>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {(recent ?? []).map((r) => (
            <li key={r.id} className="flex flex-wrap justify-between gap-sm py-xs">
              <span>
                {r.full_name} · {t.kind[r.kind]}
                {r.rejection_reason && (
                  <span className="text-xs text-red-700"> — {r.rejection_reason}</span>
                )}
              </span>
              <span className="text-xs text-ink-secondary">
                {c.reviewStatus[r.status]} · {date(locale, r.reviewed_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
