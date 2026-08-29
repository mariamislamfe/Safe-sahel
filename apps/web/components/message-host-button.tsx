"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";

/** Starts (or resumes) a conversation for a property between a guest and its owner — works from either side. */
export function MessageHostButton({
  propertyId,
  ownerId,
  guestId,
  label = "Message host",
}: {
  propertyId: string;
  ownerId: string;
  guestId?: string;
  label?: string;
}) {
  const router = useRouter();
  const { profile } = useCurrentProfile();
  const [starting, setStarting] = useState(false);

  if (!profile) return null;
  const resolvedGuestId = guestId ?? profile.id;
  if (profile.id !== resolvedGuestId && profile.id !== ownerId) return null;
  if (resolvedGuestId === ownerId) return null;

  async function startConversation() {
    setStarting(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("conversations")
      .upsert(
        { property_id: propertyId, guest_id: resolvedGuestId, owner_id: ownerId },
        { onConflict: "property_id,guest_id,owner_id", ignoreDuplicates: false },
      )
      .select("id")
      .single();

    setStarting(false);
    if (!error && data) {
      router.push(`/messages/${data.id}`);
    }
  }

  return (
    <button
      onClick={startConversation}
      disabled={starting}
      className="flex items-center gap-xs rounded-md border border-border px-lg py-sm text-sm font-medium text-ink-secondary hover:border-turquoise hover:text-turquoise-dark disabled:opacity-60"
    >
      💬 {starting ? "Starting…" : label}
    </button>
  );
}
