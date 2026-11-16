import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OwnerShell } from "@/components/owner-shell";
import { getOwnerPendingCount } from "@/lib/queries/owner-dashboard";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/owner");

  const pendingCount = await getOwnerPendingCount(user.id).catch(() => 0);

  return <OwnerShell pendingCount={pendingCount}>{children}</OwnerShell>;
}
