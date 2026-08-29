import { createClient } from "@/lib/supabase/server";
import { AdminCompoundsManager } from "@/components/admin-compounds-manager";

export default async function AdminCompoundsPage() {
  const supabase = await createClient();
  const { data: compounds } = await supabase
    .from("compounds")
    .select("id, name, area")
    .order("name");

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Compounds</h1>
      <AdminCompoundsManager initialCompounds={compounds ?? []} />
    </div>
  );
}
