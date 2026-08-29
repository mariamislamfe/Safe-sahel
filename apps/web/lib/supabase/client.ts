import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@safe-sahel/types";
import { env } from "../env";

/** Supabase client for Client Components — reads/writes the auth cookie via the browser. */
export function createClient() {
  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
