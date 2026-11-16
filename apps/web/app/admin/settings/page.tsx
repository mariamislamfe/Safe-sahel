import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { AdminPricesForm, AdminRulesForm } from "@/components/admin-settings-form";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const t = adminDict[await getLocale()].settings;
  const [{ data: prices }, { data: settings }] = await Promise.all([
    supabase.from("subscription_prices").select("plan, tier, price_egp"),
    supabase.from("platform_settings").select("key, value"),
  ]);

  return (
    <div className="flex flex-col gap-2xl">
      <h1 className="font-display text-2xl font-bold">{t.title}</h1>
      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.prices}</h2>
        <AdminPricesForm prices={prices ?? []} />
      </section>
      <section className="flex flex-col gap-md">
        <h2 className="font-display text-lg font-semibold">{t.keys}</h2>
        <AdminRulesForm
          settings={Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]))}
        />
      </section>
    </div>
  );
}
