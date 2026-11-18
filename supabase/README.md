# Supabase

Phase 0 does not require Docker or the Supabase CLI — you connect both apps
to a hosted Supabase project instead.

## 1. Create the project

1. Go to https://supabase.com/dashboard and create a new project (pick a
   region close to Egypt, e.g. Frankfurt).
2. In **Project Settings → API**, copy the **Project URL** and the
   **anon public** key. You'll paste these into `.env.local` files in
   `apps/web` and `apps/mobile` (see the root README).

## 2. Apply the schema

Open **SQL Editor** in the Supabase dashboard and run each file in
[`migrations/`](./migrations) **in order** (`0001_init.sql`, then
`0002_listings.sql`, and so on as more land). Each migration is additive —
running them in order once is enough; there's no down-migration story yet.

- `0001_init.sql` — `profiles`, the `user_role` enum, RLS, and the
  auto-create-profile-on-signup trigger.
- `0002_listings.sql` — `compounds`, `properties`, `property_images`,
  `amenities`, `property_amenities`, and per-property inventory tables, with
  RLS so published properties are publicly readable and everything else is
  owner-only.
- `0003_booking_and_role_signup.sql` — lets signup choose guest vs owner;
  `availability_blocks` (with a Postgres exclusion constraint so two
  bookings can never overlap the same property), `bookings`,
  `platform_settings` (deposit %, subscription price — admin-editable, never
  hardcoded), `reviews`, `favorites`.
- `0004_storage.sql` — the `property-images` Storage bucket + RLS so owners
  can only upload/delete under their own folder.
- `0005_admin_access.sql` — an `is_admin()` helper and admin-only RLS
  policies so the admin panel can manage every property/compound/amenity/
  booking, not just an admin's own rows.
- `0006_profile_and_verification.sql` — `profiles.username` and
  `profiles.verified` (a user-level badge, distinct from
  `properties.verified`), lets any signed-in user add a new compound, and
  adds the identity-verification request flow: `verification_requests`
  table + a **private** `verification-documents` Storage bucket for ID
  photos (only the uploader and admins can ever read it).
- `0007_subscriptions_and_messaging.sql` — a property can only be
  `published` with an active subscription (enforced by a check constraint);
  `subscription_codes` + `redeem_subscription_code()` let an owner activate
  with an admin-issued code (or the bootstrap code `0000`, always valid,
  until real code generation is the norm) without ever getting direct table
  access to the codes; `conversations` + `messages` for in-platform chat
  between guest and owner, with Realtime enabled on `messages`.
- `0008_fix_booking_cancel.sql` — fixes a bug where guests could never
  actually cancel a pending booking (the RLS policy had no `WITH CHECK`, so
  the status update silently affected zero rows), and lets a guest release
  the date hold tied to a booking they cancel.
- `0009_featured_properties.sql` — adds `properties.featured` (admin-only
  paid placement) and fixes the same "no `WITH CHECK`" class of bug for
  `properties.verified`, which — unlike `profiles.verified` — never got
  protected against an owner setting it on their own listing.
- `0010_property_detail_fields.sql` — size/beds, check-in instructions,
  village/beach access text, house rules, cancellation policy.
- `0011_compound_images.sql` — the `compound-images` Storage bucket, so
  anyone adding a new compound from the property form can upload a real
  cover photo instead of leaving it blank.
- `0012_fix_availability_block_policies.sql` — **fixes booking requests
  being rejected for every date, always.** `availability_blocks` RLS only
  ever covered the owner's manual "block these dates" feature
  (`reason = 'owner_blocked'`); nothing allowed a guest to insert the
  `pending_hold` row a booking request creates, or an owner to confirm/
  decline it. Every booking attempt hit that wall and surfaced as "someone
  else just booked these dates" regardless of the actual dates picked. Also
  adds the missing `WITH CHECK` to the owner booking-update policy
  (same class of bug as 0008/0009, no visible symptom yet but closes the
  gap).
- `0013_booking_handover.sql` — `booking_handovers` + `booking_handover_photos`
  and the `handover-photos` Storage bucket: at check-in and check-out the
  owner photographs every inventory item, an admin reviews before/after and
  records a deposit deduction if something's missing, and the guest can see
  the outcome on their booking.
- `0014_instant_booking.sql` — bookings confirm instantly instead of
  waiting on the owner (the exclusion constraint already prevents
  double-booking, so manual approval was just friction), and fixes the
  guest-cancel / hold policies, which only ever covered the old
  `pending_payment` / `pending_hold` state — this is why cancelling a
  booking threw "new row violates row-level security policy for table
  bookings" once bookings started arriving as `confirmed`.
- `0015_cancellation_fee_guest_reviews_inventory_photos.sql` —
  `bookings.cancellation_fee_amount` (cancelling within 3 days of check-in
  forfeits the deposit); `guest_reviews` (the host-rates-guest side of
  reviews — `reviews` only ever covered guest-rates-property); and
  `property_inventory_items.photo_url` + the `inventory-photos` bucket, so
  each inventory item has a reference photo guests can see up front and
  the handover photos get compared against.
- `0016_message_read_receipts.sql` — adds the UPDATE policy `messages` was
  missing entirely (marking a message read was always silently rejected by
  RLS, so the unread badge never actually cleared), and full replica
  identity so read-receipt ticks update live over Realtime.

- `0017_booking_status_values.sql` — adds the `pending` / `expired` booking
  statuses. **Run it on its own first** (Postgres can't use a new enum value
  in the same transaction that adds it).
- `0018_business_alignment.sql` — the trust / booking-request / subscription
  / ID-security / analytics overhaul: request → confirm/decline/expire/cancel
  RPCs (24h expiry, dates block only on confirm, strikes), publish gate (≥5
  photos + price + verified owner or approved broker + coverage), owner &
  broker verification with legal name, broker authorizations, private
  `guest-ids` / `payment-proofs` buckets with no client read access, logged
  60-second signed URLs, 30-day guest-ID retention, InstaPay payments →
  subscriptions, featured slots (max 3/compound), season guarantee, listing
  analytics, duplicate detection, focus compounds, and data cleanup (test
  listings unpublished, "مراسي" merged into Marassi). Every data change is
  recorded in `data_migration_log`.

- `0019_staff_roles.sql` — team roles for the admin dashboard. The founder
  (`role = 'admin'`) keeps full access; team members get a job title and a
  set of sections (`verification`, `listings`, `bookings`, `payments`,
  `reports`, `users`, `catalog`, `security`), enforced by RLS and the admin
  RPCs. Settings/prices, team management and guest ID documents stay
  founder-only. Manage it from **Admin → Team & roles**. Requires 0018.
  Revert with [`down/0019_staff_roles.down.sql`](./migrations/down/0019_staff_roles.down.sql).
- `0020_signup_phone_and_terms.sql` — copies the signup phone (normalized) and
  accepted terms version into `profiles`, and adds the `missing_phone` publish
  blocker (hosts need a WhatsApp number). Revert with
  [`down/0020_signup_phone_and_terms.down.sql`](./migrations/down/0020_signup_phone_and_terms.down.sql).
- `0021_property_types.sql` — chalets, villas and studios only: adds `studio`,
  remaps apartment → chalet and twin/town house → villa, and adds a check
  constraint. Revert with [`down/0021_property_types.down.sql`](./migrations/down/0021_property_types.down.sql).
- `0022_admin_delete.sql` — permanent delete for the founder:
  `admin_delete_property` / `admin_delete_user` (plus internal `purge_*`
  helpers that clear RESTRICT-linked rows in order). Storage files aren't
  removed. Revert with [`down/0022_admin_delete.down.sql`](./migrations/down/0022_admin_delete.down.sql).

## Demo data

Paste [`seed/demo.sql`](./seed/demo.sql) into the SQL Editor (needs 0022) to
create demo owners/guests (password `Demo@12345`), 6 published listings, past
stays with reviews and live booking requests made through the real RPCs.
Remove it all with [`seed/demo-clean.sql`](./seed/demo-clean.sql).

**Reverting 0018:** (revert 0022, 0021, 0020, then 0019 first) run [`down/0018_business_alignment.down.sql`](./migrations/down/0018_business_alignment.down.sql).
It restores the moved/unpublished rows from `data_migration_log` and drops
everything 0018 added (export new tables first if you want to keep them).

**Tests:** [`tests/migrations.test.mjs`](./tests/migrations.test.mjs) applies
every migration to an in-process Postgres (PGlite) and checks ~75 business
rules end to end, including the down → up round trip. See the header of the
file for how to run it.

Optionally also run [`seed.sql`](./seed.sql) for a handful of real North
Coast compound names and a starter amenities catalog to develop against.

## Promoting an account to admin

There's no self-serve way to become an admin (by design). After signing up
normally through the app, run this in the SQL Editor with your own email:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## 3. (Optional) Install the Supabase CLI later

Once you're comfortable, `supabase link` + `supabase db push` will apply
`migrations/*.sql` automatically instead of pasting SQL by hand, and
`supabase gen types typescript` regenerates
`packages/types/supabase-generated.ts` from the live schema. Not required
for Phase 0.
