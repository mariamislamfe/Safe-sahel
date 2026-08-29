import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VerificationForm } from "@/components/verification-form";

export default async function VerifyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-lg px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold tracking-tight">Request verification</h1>
        <p className="text-ink-secondary">
          Verified accounts get a badge next to their name and priority placement in search.
        </p>
      </div>
      <VerificationForm profileId={user.id} defaultFullName={profile?.full_name ?? ""} />
    </main>
  );
}
