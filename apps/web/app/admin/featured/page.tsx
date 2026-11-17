import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { compoundList } from "@/lib/queries/admin";
import { getPlatformSetting } from "@/lib/queries/owner-dashboard";
import { CancelFeatured, GrantFeatured } from "@/components/admin-actions";
import { Card, PageHeader, Pill } from "@/components/admin/ui";

export default async function AdminFeaturedPage() {
  await requireSection("featured");
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].featured;
  const nowIso = new Date().toISOString();

  const [compounds, { data: slots }, { data: live }, maxPerCompound] = await Promise.all([
    compoundList(),
    supabase
      .from("featured_slots")
      .select("*")
      .is("cancelled_at", null)
      .gt("ends_at", nowIso)
      .order("starts_at"),
    supabase
      .from("properties")
      .select("id, title, compound_id")
      .eq("status", "published")
      .is("deleted_at", null),
    getPlatformSetting<number>("featured_max_per_compound", 3),
  ]);
  const titleById = new Map((live ?? []).map((p) => [p.id, p.title]));
  const { data: allTitles } = (slots ?? []).length
    ? await supabase
        .from("properties")
        .select("id, title")
        .in(
          "id",
          (slots ?? []).map((s) => s.property_id),
        )
    : { data: [] as { id: string; title: string }[] };
  for (const p of allTitles ?? []) titleById.set(p.id, p.title);

  return (
    <>
      <PageHeader title={t.title} description={t.body} />
      <div className="grid grid-cols-1 gap-md md:grid-cols-2 xl:grid-cols-3">
        {compounds.map((c) => {
          const compoundSlots = (slots ?? []).filter((s) => s.compound_id === c.id);
          const current = new Set(
            compoundSlots.filter((s) => s.starts_at <= nowIso).map((s) => s.property_id),
          );
          const free = Math.max(0, maxPerCompound - current.size);
          const candidates = (live ?? [])
            .filter((p) => p.compound_id === c.id && !current.has(p.id))
            .map((p) => ({ id: p.id, title: p.title }));
          return (
            <Card key={c.id}>
              <div className="flex flex-col gap-md">
                <div className="flex items-center justify-between gap-sm">
                  <p className="font-display font-semibold">
                    {c.is_focus && <span className="text-amber-500">★ </span>}
                    {locale === "ar" && c.name_ar ? c.name_ar : c.name}
                  </p>
                  <span className="flex items-center gap-1" aria-label={t.free(free)}>
                    {Array.from({ length: maxPerCompound }, (_, i) => (
                      <span
                        key={i}
                        className={`h-2 w-5 rounded-full ${i < current.size ? "bg-turquoise" : "bg-surface-soft ring-1 ring-border"}`}
                      />
                    ))}
                  </span>
                </div>
                {compoundSlots.length > 0 && (
                  <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
                    {compoundSlots.map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-sm p-sm">
                        <span className="min-w-0 text-sm">
                          <span className="block truncate font-medium">
                            ⭐ {titleById.get(s.property_id) ?? "—"}
                          </span>
                          <span className="text-xs text-ink-secondary">
                            {t.source[s.source]} · {t.until(date(locale, s.ends_at))}
                          </span>
                        </span>
                        <CancelFeatured slotId={s.id} />
                      </li>
                    ))}
                  </ul>
                )}
                <Pill tone={free > 0 ? "success" : "neutral"}>{t.free(free)}</Pill>
                {free > 0 && <GrantFeatured listings={candidates} />}
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );
}
