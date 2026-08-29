import { supabaseEnvSchema } from "@safe-sahel/validation";

const result = supabaseEnvSchema.safeParse({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!result.success) {
  // A raw ZodError thrown here crashes every page (SiteHeader needs a
  // Supabase client, so this module loads on every route) with a confusing
  // secondary error — Next's dev overlay chokes on ZodError's getter-only
  // `message` property. Throwing a plain Error instead surfaces the real
  // problem clearly: missing/misnamed env vars.
  throw new Error(
    "Missing or invalid Supabase env vars. Copy apps/web/.env.local.example to " +
      "apps/web/.env.local and fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY " +
      "from your Supabase project's Settings → API page, then restart `pnpm dev:web`.",
  );
}

export const env = result.data;
