"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function AdminVerificationActions({
  requestId,
  profileId,
}: {
  requestId: string;
  profileId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"approve" | "reject" | "contacted" | null>(null);

  async function act(next: "approved" | "rejected" | "contacted") {
    setPending(next === "approved" ? "approve" : next === "rejected" ? "reject" : "contacted");
    const supabase = createClient();

    await supabase
      .from("verification_requests")
      .update({ status: next, reviewed_at: new Date().toISOString() })
      .eq("id", requestId);

    if (next === "approved") {
      await supabase.from("profiles").update({ verified: true }).eq("id", profileId);
    }

    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-sm">
      <button
        onClick={() => act("contacted")}
        disabled={pending !== null}
        className="rounded-md border border-border px-md py-xs text-sm text-ink-secondary hover:border-turquoise disabled:opacity-60"
      >
        {pending === "contacted" ? "Saving…" : "Mark contacted"}
      </button>
      <button
        onClick={() => act("approved")}
        disabled={pending !== null}
        className="rounded-md bg-turquoise px-md py-xs text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {pending === "approve" ? "Approving…" : "Approve & verify"}
      </button>
      <button
        onClick={() => act("rejected")}
        disabled={pending !== null}
        className="rounded-md border border-border px-md py-xs text-sm text-ink-secondary hover:border-red-300 hover:text-red-600 disabled:opacity-60"
      >
        {pending === "reject" ? "Rejecting…" : "Reject"}
      </button>
    </div>
  );
}
