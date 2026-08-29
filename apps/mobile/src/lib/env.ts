import { supabaseEnvSchema } from "@safe-sahel/validation";

const result = supabaseEnvSchema.safeParse({
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});

if (!result.success) {
  throw new Error(
    "Missing or invalid Supabase env vars. Copy apps/mobile/.env.local.example to " +
      "apps/mobile/.env.local and fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY " +
      "from your Supabase project's Settings → API page, then restart `pnpm dev:mobile`.",
  );
}

export const env = result.data;
