import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient } from "@safe-sahel/api-client";
import { env } from "./env";

// React Native has no cookies/localStorage, so auth session persistence
// goes through AsyncStorage instead — this is the one thing that differs
// from the web client (apps/web/lib/supabase/*, which uses @supabase/ssr).
export const supabase = createSupabaseClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
