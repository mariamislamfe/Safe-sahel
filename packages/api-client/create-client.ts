import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";
import type { Database } from "@safe-sahel/types";

/**
 * Platform-agnostic Supabase client factory, typed against the generated
 * `Database` schema. Each app wraps this with its own concerns:
 *
 *  - apps/mobile calls this directly with an AsyncStorage-backed `auth.storage`
 *    (React Native has no cookies).
 *  - apps/web does NOT use this directly — Next.js App Router needs
 *    cookie-aware browser/server clients from `@supabase/ssr` instead, so
 *    web has its own `lib/supabase/{client,server}.ts`. This factory stays
 *    here as the one both could theoretically share for simple, non-SSR
 *    Supabase usage (e.g. edge functions).
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">,
) {
  return createClient<Database>(url, anonKey, options);
}
