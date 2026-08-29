import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@safe-sahel/types";
import { env } from "../env";

/**
 * Supabase client for Server Components, Server Actions, and Route Handlers.
 * Cookie writes are wrapped in try/catch because Server Components can only
 * read cookies — writes there are a no-op the middleware refresh covers.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — safe to ignore, see doc comment above.
        }
      },
    },
  });
}
