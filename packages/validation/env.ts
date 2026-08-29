import { z } from "zod";

/**
 * Shape of the two env vars every client (web, mobile, edge functions)
 * needs to talk to Supabase. Each app defines its own schema that maps its
 * platform-specific env var names onto this shape — see
 * apps/web/lib/env.ts and apps/mobile/lib/env.ts.
 */
export const supabaseEnvSchema = z.object({
  supabaseUrl: z.string().url(),
  supabaseAnonKey: z.string().min(1),
});

export type SupabaseEnv = z.infer<typeof supabaseEnvSchema>;
