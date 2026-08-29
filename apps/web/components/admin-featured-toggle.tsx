"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminFeaturedToggle({
  propertyId,
  featured,
}: {
  propertyId: string;
  featured: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    setPending(true);
    const supabase = createClient();
    await supabase.from("properties").update({ featured: !featured }).eq("id", propertyId);
    setPending(false);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`rounded-full border px-md py-xs text-xs font-medium transition-colors disabled:opacity-60 ${
        featured
          ? "border-turquoise bg-turquoise-light text-turquoise-dark"
          : "border-border text-ink-secondary hover:border-turquoise"
      }`}
    >
      {pending ? "…" : featured ? "★ Featured" : "Make featured"}
    </button>
  );
}
