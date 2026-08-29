import path from "node:path";
import type { NextConfig } from "next";

const supabaseHostname = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  // Without a .git directory at the monorepo root (added once you run
  // `git init`), Turbopack can't infer the workspace boundary on its own —
  // point it at the repo root explicitly so it resolves packages/* correctly.
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  images: {
    remotePatterns: [
      // picsum.photos is only used for seed/dev placeholder photos (see
      // supabase/seed.sql).
      { protocol: "https", hostname: "picsum.photos" },
      // Curated Unsplash stock photography for marketing surfaces (hero) —
      // never used to imply a specific property's real photos.
      { protocol: "https", hostname: "images.unsplash.com" },
      // Real property photos, uploaded to Supabase Storage — derived from
      // NEXT_PUBLIC_SUPABASE_URL so this works for whichever project you connect.
      ...(supabaseHostname ? [{ protocol: "https" as const, hostname: supabaseHostname }] : []),
    ],
  },
};

export default nextConfig;
