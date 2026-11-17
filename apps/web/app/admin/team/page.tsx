import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { requireSection } from "@/lib/admin-access";
import { TeamMemberForm, TeamMemberRow } from "@/components/admin/team-manager";
import { Card, EmptyState, PageHeader, Section } from "@/components/admin/ui";

export default async function AdminTeamPage() {
  await requireSection("team");
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminShellDict[locale].team;
  const { data: members, error } = await supabase.rpc("admin_list_staff");

  return (
    <>
      <PageHeader title={t.title} description={t.body} />
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-md py-sm text-sm text-red-700">
          {error.message}
        </p>
      )}
      <Section title={t.add}>
        <Card>
          <TeamMemberForm />
        </Card>
      </Section>
      <Section title={t.members} count={(members ?? []).filter((m) => m.active).length}>
        {(members ?? []).length === 0 ? (
          <EmptyState icon="team" title={t.empty} />
        ) : (
          <ul className="flex flex-col gap-sm">
            {(members ?? []).map((m) => (
              <TeamMemberRow key={m.profile_id} member={m} />
            ))}
          </ul>
        )}
      </Section>
    </>
  );
}
