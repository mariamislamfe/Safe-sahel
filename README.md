# Safe Sahel

Vacation-rental marketplace for Egypt's North Coast. Monorepo containing the
website (Next.js), the mobile app (Expo/React Native), and the shared
packages both build on.

## What's built

**Guest**: sign up/log in, browse & search, property detail, request-to-book
(no online payment yet — see below), favorites, booking history, reviews
after a stay.

**Owner**: same account can enable hosting, dashboard, add/edit property
(web has the full editor — photos, amenities, inventory; mobile has a
simpler create form only), confirm/decline booking requests.

**Admin**: promote an account manually (see below), then manage users,
properties (approve/suspend), bookings, compounds, amenities, and settings
(deposit %, subscription price).

**Not built yet, on purpose**: real online payment (needs a Paymob/Kashier
merchant account — a business step, not a code step) — bookings are
confirmed manually by the owner instead; the deposit/check-in-check-out
documentation flow; push notifications; day-use-vs-overnight scheduling
rules beyond what's in the schema.

Every route above has been typechecked, linted, and built successfully in
this environment — but **against no live Supabase project**, since none is
connected here. Follow "Connect Supabase" below, then verify it end to end
yourself.

## Prerequisites

- Node.js 20+ (Node 22 is what this was built and verified with)
- pnpm 10 (`corepack enable` will pick up the version pinned in `package.json`)
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)) — for testing the mobile app during development
- A free [Supabase](https://supabase.com) account

## 1. Install

```bash
pnpm install
```

## 2. Connect Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. In **Project Settings → API**, copy the **Project URL** and **anon public** key.
3. In the Supabase dashboard's **SQL Editor**, run every file in
   [`supabase/migrations/`](./supabase/migrations) **in order** — `0001` through
   `0005`. Each one depends on the tables/types the previous one created, so
   running them out of order will fail partway through. Details on what each
   migration does are in [`supabase/README.md`](./supabase/README.md).
4. Optionally also run [`supabase/seed.sql`](./supabase/seed.sql) — a demo
   owner account and 3 example properties so `/search` has something to show
   right away.
5. Create the two apps' env files from their examples and fill in the values
   from step 2:

   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   cp apps/mobile/.env.local.example apps/mobile/.env.local
   ```

   | File                     | Variables                                                   |
   | ------------------------ | ----------------------------------------------------------- |
   | `apps/web/.env.local`    | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
   | `apps/mobile/.env.local` | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` |

   Both are safe to expose to the client — they're the public anon key, not
   the service-role key. Never put the service-role key in either app; it
   only ever belongs server-side (Supabase Edge Functions, later).

   The home screens render without this step, but almost everything else —
   search, booking, hosting, admin — needs a real Supabase connection to work.

6. To reach the admin panel, sign up normally through the app first, then
   promote that account with the SQL snippet in
   [`supabase/README.md`](./supabase/README.md#promoting-an-account-to-admin).

## 3. Run the website

```bash
pnpm dev:web
```

Opens at [http://localhost:3000](http://localhost:3000).

## 4. Run the mobile app

```bash
pnpm dev:mobile
```

This starts the Expo dev server and prints a QR code in the terminal.

- **On your phone**: open Expo Go and scan the QR code (Android: in-app
  scanner; iOS: your regular Camera app, then tap the notification).
- Your phone and computer need to be on the **same Wi-Fi network**.
- The app reloads automatically as you edit files under `apps/mobile/src`.

## Everyday commands

| Command           | What it does                               |
| ----------------- | ------------------------------------------ |
| `pnpm dev:web`    | Next.js dev server                         |
| `pnpm dev:mobile` | Expo dev server (scan the QR with Expo Go) |
| `pnpm lint`       | ESLint across every app/package            |
| `pnpm typecheck`  | `tsc --noEmit` across every app/package    |
| `pnpm format`     | Prettier, writes changes                   |
| `pnpm build`      | Production build (web only, for now)       |

## Repository layout

```
apps/
  web/      Next.js (App Router) — the website
  mobile/   Expo + Expo Router — the mobile app
packages/
  config/       Design tokens (colors, spacing, radius, type) — single source
                for both apps' Tailwind/NativeWind configs
  types/        Shared TypeScript types, incl. the Supabase-generated schema
  validation/   Shared Zod schemas
  utils/        Shared helpers (e.g. `cn()` for class merging)
  api-client/   Supabase client factory + shared TanStack Query defaults
supabase/
  migrations/   SQL migrations (0001–0005), applied via the Supabase SQL Editor for now
  seed.sql      Demo owner + example properties for local development
```

See [`supabase/README.md`](./supabase/README.md) for schema/database notes.
