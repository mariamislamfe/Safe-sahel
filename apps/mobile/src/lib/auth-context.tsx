import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { UserRoleEnum } from "@safe-sahel/types";
import { supabase } from "./supabase";

export type CurrentProfile = {
  id: string;
  email: string | undefined;
  fullName: string | null;
  avatarUrl: string | null;
  username: string | null;
  role: UserRoleEnum;
  verified: boolean;
};

type AuthState = { profile: CurrentProfile | null; loading: boolean; refetch: () => Promise<void> };

const AuthContext = createContext<AuthState>({
  profile: null,
  loading: true,
  refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<CurrentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
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
    // Deferred to a microtask — see apps/web/lib/hooks/use-current-profile.ts
    // for why calling load() directly here trips react-hooks/set-state-in-effect.
    Promise.resolve().then(load);
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => subscription.subscription.unsubscribe();
  }, [load]);

  return (
    <AuthContext.Provider value={{ profile, loading, refetch: load }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
