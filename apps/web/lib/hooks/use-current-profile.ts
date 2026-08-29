"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRoleEnum } from "@safe-sahel/types";

export type CurrentProfile = {
  id: string;
  email: string | undefined;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  role: UserRoleEnum;
  verified: boolean;
};

/**
 * Client-side session + profile, kept in sync with auth state changes
 * (login/logout in another tab, etc). Also exposes `refetch` — after a
 * direct row update (e.g. "Enable hosting" flipping role), `router.refresh()`
 * does NOT re-run this hook (it's client-fetched state, not tied to Next's
 * router), so callers must call `refetch()` explicitly or the UI appears to
 * hang on stale data.
 */
export function useCurrentProfile() {
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;

    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, username, role, verified")
      .eq("id", user.id)
      .single();

    setProfile({
      id: user.id,
      email: user.email,
      fullName: data?.full_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
      username: data?.username ?? null,
      role: data?.role ?? "guest",
      verified: data?.verified ?? false,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    // Deferred to a microtask — calling load() (which setStates) directly
    // and synchronously in the effect body trips react-hooks/set-state-in-effect.
    Promise.resolve().then(load);

    const supabase = createClient();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => subscription.subscription.unsubscribe();
  }, [load]);

  return { profile, loading, refetch: load };
}
