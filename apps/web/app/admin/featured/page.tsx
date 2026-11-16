import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { date } from "@/lib/i18n/format";
import { compoundList } from "@/lib/queries/admin";
import { CancelFeatured, GrantFeatured } from "@/components/admin-actions";

export default async function AdminFeaturedPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].featured;
  const nowIso = new Date().toISOString();

  const [compounds, { data: slots }, { data: live }] = await Promise.all([
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
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.body}</p>
      </div>
      <div className="grid grid-cols-1 gap-md md:grid-cols-2">
        {compounds.map((c) => {
          const compoundSlots = (slots ?? []).filter((s) => s.compound_id === c.id);
          const current = new Set(
            compoundSlots.filter((s) => s.starts_at <= nowIso).map((s) => s.property_id),
          );
          const free = Math.max(0, 3 - current.size);
          const candidates = (live ?? [])
            .filter((p) => p.compound_id === c.id)
            .map((p) => ({ id: p.id, title: p.title }));
          return (
            <div key={c.id} className="flex flex-col gap-sm rounded-2xl border border-border p-md">
              <div className="flex items-center justify-between gap-sm">
                <p className="font-display font-semibold">
                  {c.is_focus && "★ "}
                  {locale === "ar" && c.name_ar ? c.name_ar : c.name}
                </p>
                <span className="flex gap-0.5" aria-label={t.free(free)}>
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`size-3 rounded-full ${i < current.size ? "bg-turquoise" : "bg-surface-soft ring-1 ring-border"}`}
                    />
                  ))}
                </span>
              </div>
              {compoundSlots.length > 0 && (
                <ul className="flex flex-col gap-xs text-sm">
                  {compoundSlots.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-sm">
                      <span>
                        ⭐ {titleById.get(s.property_id) ?? "—"}{" "}
                        <span className="text-xs text-ink-secondary">
                          · {t.source[s.source]} · {date(locale, s.starts_at)} →{" "}
                          {t.until(date(locale, s.ends_at))}
                        </span>
                      </span>
                      <CancelFeatured slotId={s.id} />
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs text-ink-secondary">{t.free(free)}</p>
              {free > 0 && <GrantFeatured listings={candidates} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
