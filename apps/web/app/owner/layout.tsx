import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OwnerShell } from "@/components/owner-shell";

export default async function OwnerLayout({ children }: LayoutProps<"/owner">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <OwnerShell>{children}</OwnerShell>;
}
