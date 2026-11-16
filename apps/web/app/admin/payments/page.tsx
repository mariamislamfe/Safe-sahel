import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { dateTime, money } from "@/lib/i18n/format";
import { hoursSince, profileMap, propertyMap } from "@/lib/queries/admin";
import { DocumentViewButton } from "@/components/document-view-button";
import { ReviewPayment } from "@/components/admin-actions";

export default async function AdminPaymentsPage() {
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

  const what = (p: (typeof all)[number]) =>
    `${p.kind === "featured" ? plans.kindFeatured(p.featured_weeks ?? 1) : (plans.plans[p.plan ?? ""]?.name ?? p.plan)} · ${p.property_ids
      .map((id) => props.get(id)?.title ?? "—")
      .join("، ")}`;

  return (
    <div className="flex flex-col gap-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">
          {t.title} ({pending?.length ?? 0})
        </h1>
        <p className="text-sm text-ink-secondary">{t.hint}</p>
      </div>

      {(pending ?? []).length === 0 ? (
        <p className="text-sm text-ink-secondary">{t.empty}</p>
      ) : (
        <div className="flex flex-col gap-md">
          {(pending ?? []).map((p) => (
            <div
              key={p.id}
              className="flex flex-col gap-md rounded-2xl border border-border p-lg md:flex-row md:items-center md:justify-between"
            >
              <div className="flex flex-col gap-xs text-sm">
                <p className="font-display text-xl font-bold">{money(locale, p.amount_egp)}</p>
                <p>
                  <span className="text-ink-secondary">{t.owner}:</span>{" "}
                  {owners.get(p.owner_id)?.name ?? "—"}{" "}
                  <span className="text-ink-secondary" dir="ltr">
                    {owners.get(p.owner_id)?.phone}
                  </span>
                </p>
                <p>
                  <span className="text-ink-secondary">{t.what}:</span> {what(p)}
                </p>
                <p>
                  <span className="text-ink-secondary">{t.reference}:</span>{" "}
                  <span className="font-mono font-semibold" dir="ltr">
                    {p.instapay_reference}
                  </span>{" "}
                  ·{" "}
                  <span className="text-xs text-ink-secondary">⏱ {hoursSince(p.created_at)}h</span>
                </p>
                {p.proof_path && (
                  <DocumentViewButton kind="payment_proof" id={p.id} label={t.proof} />
                )}
              </div>
              <ReviewPayment id={p.id} />
            </div>
          ))}
        </div>
      )}

      <section className="flex flex-col gap-sm">
        <h2 className="font-display text-lg font-semibold">{t.history}</h2>
        <ul className="flex flex-col divide-y divide-border text-sm">
          {(recent ?? []).map((p) => (
            <li key={p.id} className="flex flex-wrap justify-between gap-sm py-xs">
              <span>
                {owners.get(p.owner_id)?.name ?? "—"} · {what(p)} · {money(locale, p.amount_egp)}
                {p.rejection_reason && (
                  <span className="text-xs text-red-700"> — {p.rejection_reason}</span>
                )}
              </span>
              <span className="text-xs text-ink-secondary">
                {c.reviewStatus[p.status]} · {dateTime(locale, p.reviewed_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
