import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSubscriptionCodes } from "@/components/admin-subscription-codes";

export default async function AdminSubscriptionCodesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: codes } = await supabase
    .from("subscription_codes")
    .select("id, code, used_by_property_id, used_at, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Subscription codes</h1>
      <AdminSubscriptionCodes adminId={user.id} initialCodes={codes ?? []} />
    </div>
  );
}
