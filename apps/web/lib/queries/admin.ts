import { createClient } from "@/lib/supabase/server";

/** id → display info for a set of profiles (admin RLS can read all). */
export async function profileMap(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0)
    return new Map<
      string,
      { name: string; phone: string | null; verified: boolean; hostType: string | null }
    >();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, legal_name, phone, verified, host_type")
    .in("id", unique);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      {
        name: p.legal_name ?? p.full_name ?? "—",
        phone: p.phone,
        verified: p.verified,
        hostType: p.host_type,
      },
    ]),
  );
}

export async function propertyMap(ids: (string | null | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean) as string[])];
  if (unique.length === 0)
    return new Map<
      string,
      { title: string; ownerId: string; compoundId: string | null; status: string }
    >();
  const supabase = await createClient();
  const { data } = await supabase
    .from("properties")
    .select("id, title, owner_id, compound_id, status")
    .in("id", unique);
  return new Map(
    (data ?? []).map((p) => [
      p.id,
      { title: p.title, ownerId: p.owner_id, compoundId: p.compound_id, status: p.status },
    ]),
  );
}

export async function compoundList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("compounds")
    .select("id, name, name_ar, is_focus, focus_rank")
    .eq("hidden", false)
    .order("name");
  return (data ?? []).sort((a, b) =>
    a.is_focus !== b.is_focus
      ? a.is_focus
        ? -1
        : 1
      : (a.focus_rank ?? 99) - (b.focus_rank ?? 99) || a.name.localeCompare(b.name),
  );
}

export function hoursSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000));
}
