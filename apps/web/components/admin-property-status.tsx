"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { PropertyStatusEnum } from "@safe-sahel/types";

const statusOptions: PropertyStatusEnum[] = ["draft", "pending_review", "published", "suspended"];

export function AdminPropertyStatus({
  propertyId,
  status,
}: {
  propertyId: string;
  status: PropertyStatusEnum;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function updateStatus(next: PropertyStatusEnum) {
    setBusy(true);
    const supabase = createClient();
    await supabase.from("properties").update({ status: next }).eq("id", propertyId);
    setBusy(false);
    router.refresh();
  }

  return (
    <select
      value={status}
      disabled={busy}
      onChange={(e) => updateStatus(e.target.value as PropertyStatusEnum)}
      className="rounded-sm border border-border bg-surface px-sm py-xs text-sm capitalize outline-none focus:border-turquoise"
    >
      {statusOptions.map((option) => (
        <option key={option} value={option}>
          {option.replace("_", " ")}
        </option>
      ))}
    </select>
  );
}
