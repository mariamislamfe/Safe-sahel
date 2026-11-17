import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { requireSection } from "@/lib/admin-access";
import { AdminCompoundsManager } from "@/components/admin-compounds-manager";
import { PageHeader } from "@/components/admin/ui";

export default async function AdminCompoundsPage() {
  await requireSection("compounds");
  const supabase = await createClient();
  const t = adminShellDict[await getLocale()].catalog;
  const { data: compounds } = await supabase
    .from("compounds")
    .select("id, name, name_ar, area, hidden, is_focus, focus_rank")
    .is("merged_into", null)
    .order("name");
  const sorted = (compounds ?? []).sort(
    (a, b) =>
      Number(a.hidden) - Number(b.hidden) ||
      Number(b.is_focus) - Number(a.is_focus) ||
      (a.focus_rank ?? 99) - (b.focus_rank ?? 99) ||
      a.name.localeCompare(b.name),
  );

  return (
    <>
      <PageHeader title={t.compoundsTitle} description={t.compoundsBody} count={sorted.length} />
      <AdminCompoundsManager initialCompounds={sorted} />
    </>
  );
}
