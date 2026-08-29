import { createClient } from "@/lib/supabase/server";
import { AdminSettingsForm } from "@/components/admin-settings-form";

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("key, value")
    .in("key", ["deposit_percentage", "owner_subscription_price_egp"]);

  const valueByKey = new Map((settings ?? []).map((s) => [s.key, s.value]));

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Settings</h1>
      <AdminSettingsForm
        depositPercentage={Number(valueByKey.get("deposit_percentage") ?? 20)}
        subscriptionPriceEgp={Number(valueByKey.get("owner_subscription_price_egp") ?? 500)}
      />
    </div>
  );
}
