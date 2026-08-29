"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { cn } from "@safe-sahel/utils";

export function FavoriteButton({
  propertyId,
  variant = "pill",
}: {
  propertyId: string;
  variant?: "pill" | "icon";
}) {
  const { profile } = useCurrentProfile();
  const [isFavorite, setIsFavorite] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) {
      // Deferred to a microtask — setState directly in the effect body
      // (even for this reset case) trips react-hooks/set-state-in-effect.
      Promise.resolve().then(() => setIsFavorite(false));
      return;
    }
    const supabase = createClient();
    supabase
      .from("favorites")
      .select("property_id")
      .eq("guest_id", profile.id)
      .eq("property_id", propertyId)
      .maybeSingle()
      .then(({ data }) => setIsFavorite(!!data));
  }, [profile, propertyId]);

  if (!profile) return null;

  // Cards wrap this button in a <Link> (see PropertyCard) — stop the click
  // from also triggering that link's navigation. This has to live here
  // (a Client Component) rather than on a wrapping element in the card
  // itself, which is a Server Component and can't take event handler props.
  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const supabase = createClient();
    if (isFavorite) {
      await supabase
        .from("favorites")
        .delete()
        .eq("guest_id", profile!.id)
        .eq("property_id", propertyId);
    } else {
      await supabase.from("favorites").insert({ guest_id: profile!.id, property_id: propertyId });
    }
    setIsFavorite(!isFavorite);
    setBusy(false);
  }

  if (variant === "icon") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
        className="flex size-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur-sm transition-transform hover:scale-105"
      >
        <span className={isFavorite ? "text-[#E8555F]" : "text-ink-secondary"}>
          {isFavorite ? "♥" : "♡"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={isFavorite}
      className={cn(
        "rounded-full border px-md py-xs text-sm font-medium transition-colors",
        isFavorite
          ? "border-turquoise bg-turquoise-light text-turquoise-dark"
          : "border-border text-ink-secondary hover:border-turquoise hover:text-turquoise-dark",
      )}
    >
      {isFavorite ? "♥ Saved" : "♡ Save"}
    </button>
  );
}
