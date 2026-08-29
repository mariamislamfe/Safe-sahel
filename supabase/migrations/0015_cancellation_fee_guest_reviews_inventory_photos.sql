-- Safe Sahel — late-cancellation fee, two-way reviews, inventory reference photos

-- 1. Late cancellation forfeits the deposit ---------------------------------
-- Guests can cancel a confirmed booking any time, but cancelling within 3
-- days of check-in forfeits the security deposit instead of a full refund.
-- Recorded here (not actually moved — no payment gateway yet), same as the
-- handover deduction: a real decision, not fake money movement.
alter table public.bookings add column cancellation_fee_amount numeric(10, 2) not null default 0;

-- 2. Guest reviews (the other direction) -------------------------------------
-- `reviews` is guest-rates-property (cleanliness/location/etc — dimensions
-- that don't make sense for rating a person). This is the host-rates-guest
-- side: one simple rating + comment per booking, shown on the guest's
-- profile so future hosts can see their track record.
create table public.guest_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create index guest_reviews_guest_id_idx on public.guest_reviews (guest_id);

alter table public.guest_reviews enable row level security;

create policy "Guest reviews are viewable by everyone"
  on public.guest_reviews for select
  using (true);

create policy "Owners review guests on their own completed bookings"
  on public.guest_reviews for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_id and p.owner_id = auth.uid() and b.guest_id = guest_reviews.guest_id
    )
  );

-- 3. Inventory reference photos ----------------------------------------------
-- The photo the owner sets up front ("this is the blender, there are 2") —
-- distinct from the check-in/check-out handover photos (0013), which are
-- evidence captured per-stay. This is the one-time reference guests and the
-- handover comparison are checked against.
alter table public.property_inventory_items add column photo_url text;

-- Inventory was owner-only until now (it only needed to exist for the
-- handover checklist). Guests need to see it before booking too — the
-- product ask was literally "show it to the guest, so we can compare
-- against what's returned" — so publish it the same way property photos
-- already are.
create policy "Anyone can view inventory categories for published properties"
  on public.property_inventory_categories for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.status = 'published' and p.deleted_at is null
    )
  );

create policy "Anyone can view inventory items for published properties"
  on public.property_inventory_items for select
  using (
    exists (
      select 1 from public.property_inventory_categories c
      join public.properties p on p.id = c.property_id
      where c.id = category_id and p.status = 'published' and p.deleted_at is null
    )
  );

insert into storage.buckets (id, name, public)
values ('inventory-photos', 'inventory-photos', true)
on conflict (id) do nothing;

create policy "Inventory reference photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'inventory-photos');

create policy "Owners upload inventory photos under their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'inventory-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete their own inventory photo uploads"
  on storage.objects for delete
  using (
    bucket_id = 'inventory-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
