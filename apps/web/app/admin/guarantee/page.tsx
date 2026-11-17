import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { profileMap, propertyMap } from "@/lib/queries/admin";
import { GrantGuarantee } from "@/components/admin-actions";
import { Card, EmptyState, PageHeader, Pill, Section } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

export default async function AdminGuaranteePage() {
  await requireSection("guarantee");
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].guarantee;
  const { data } = await supabase.rpc("guarantee_status");
  const rows = data ?? [];
  const [owners, props] = await Promise.all([
    profileMap(rows.map((r) => r.owner_id)),
    propertyMap(rows.map((r) => r.property_id)),
  ]);

  const groups = [
    { key: "eligible", title: t.eligible, rows: rows.filter((r) => r.status === "eligible") },
    { key: "tracking", title: t.tracking, rows: rows.filter((r) => r.status === "tracking") },
    { key: "granted", title: t.granted, rows: rows.filter((r) => r.status === "granted") },
  ];

  return (
    <>
      <PageHeader title={t.title} description={t.body} />
      <div className="flex items-start gap-sm rounded-xl border border-amber-200 bg-amber-50 px-md py-sm text-sm font-medium text-amber-900">
        <Icon name="gift" className="mt-0.5 size-4 shrink-0" />
        لو ما جالكش ولا طلب حجز في أول 30 يوم من باقة الموسم، الشهر الجاي علينا
      </div>
      {groups.map((g) => (
        <Section key={g.key} title={g.title} count={g.rows.length}>
          {g.rows.length === 0 ? (
            g.key === "eligible" ? (
              <EmptyState icon="gift" title={t.empty} />
            ) : null
          ) : (
            <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
              {g.rows.map((r) => (
                <Card key={r.subscription_id} tone={g.key === "eligible" ? "warn" : "default"}>
                  <div className="flex flex-col gap-sm">
                    <div className="flex items-start justify-between gap-sm">
                      <div className="flex min-w-0 flex-col">
                        <span className="font-semibold">
                          {props.get(r.property_id)?.title ?? "—"}
                        </span>
                        <span className="text-sm text-ink-secondary">
                          {owners.get(r.owner_id)?.name ?? "—"}{" "}
                          <span dir="ltr">{owners.get(r.owner_id)?.phone}</span>
                        </span>
                      </div>
                      <Pill tone={r.requests_in_window === 0 ? "warn" : "success"}>
                        {t.requests}: {r.requests_in_window}
                      </Pill>
                    </div>
                    <p className="text-xs text-ink-secondary">
                      {t.window}: {date(locale, r.starts_at)} → {date(locale, r.window_ends_at)}
                    </p>
                    {r.status === "eligible" && (
                      <GrantGuarantee subscriptionId={r.subscription_id} />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
      ))}
    </>
  );
}
