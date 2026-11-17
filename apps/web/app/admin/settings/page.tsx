import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { requireSection } from "@/lib/admin-access";
import { AdminPricesForm, AdminRulesForm } from "@/components/admin-settings-form";
import { Card, PageHeader, Section } from "@/components/admin/ui";

export default async function AdminSettingsPage() {
  await requireSection("settings");
  const supabase = await createClient();
  const t = adminDict[await getLocale()].settings;
  const [{ data: prices }, { data: settings }] = await Promise.all([
    supabase.from("subscription_prices").select("plan, tier, price_egp"),
    supabase.from("platform_settings").select("key, value"),
  ]);

  return (
    <>
      <PageHeader title={t.title} />
      <Section title={t.prices}>
        <Card>
          <AdminPricesForm prices={prices ?? []} />
        </Card>
      </Section>
      <Section title={t.keys}>
        <Card>
          <AdminRulesForm
            settings={Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]))}
          />
        </Card>
      </Section>
    </>
  );
}
