import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@safe-sahel/types";
import { env } from "../env";

/**
 * Service-role client — bypasses RLS. Server-only: used to mint 60-second
 * signed URLs for private documents (after authorize_document_access()
 * has checked + logged the request), purge expired guest IDs, and send
 * notification emails from the cron routes.
 *
 * SUPABASE_SERVICE_ROLE_KEY has no NEXT_PUBLIC_ prefix, so Next never
 * inlines it into a client bundle. Returns null when it isn't configured so
 * callers can degrade gracefully instead of crashing the page.
 */
export function createAdminClient(): SupabaseClient<Database> | null {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient() must never run in the browser.");
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createSupabaseClient<Database>(env.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
