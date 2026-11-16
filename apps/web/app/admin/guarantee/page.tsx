import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { profileMap, propertyMap } from "@/lib/queries/admin";
import { GrantGuarantee } from "@/components/admin-actions";

export default async function AdminGuaranteePage() {
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
    <div className="flex flex-col gap-xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.body}</p>
        <p className="rounded-lg bg-butter-soft px-md py-sm text-sm font-medium">
          لو ما جالكش ولا طلب حجز في أول 30 يوم من باقة الموسم، الشهر الجاي علينا
        </p>
      </div>
      {groups.map((g) => (
        <section key={g.key} className="flex flex-col gap-sm">
          <h2 className="font-display text-lg font-semibold">
            {g.title} ({g.rows.length})
          </h2>
          {g.rows.length === 0 ? (
            g.key === "eligible" && <p className="text-sm text-ink-secondary">{t.empty}</p>
          ) : (
            <ul className="flex flex-col gap-sm">
              {g.rows.map((r) => (
                <li
                  key={r.subscription_id}
                  className="flex flex-wrap items-center justify-between gap-sm rounded-2xl border border-border p-md text-sm"
                >
                  <span>
                    <span className="font-medium">{props.get(r.property_id)?.title ?? "—"}</span> ·{" "}
                    {owners.get(r.owner_id)?.name ?? "—"}{" "}
                    <span dir="ltr" className="text-ink-secondary">
                      {owners.get(r.owner_id)?.phone}
                    </span>
                    <span className="block text-xs text-ink-secondary">
                      {t.window}: {date(locale, r.starts_at)} → {date(locale, r.window_ends_at)} ·{" "}
                      {t.requests}: {r.requests_in_window}
                    </span>
                  </span>
                  {r.status === "eligible" && <GrantGuarantee subscriptionId={r.subscription_id} />}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
