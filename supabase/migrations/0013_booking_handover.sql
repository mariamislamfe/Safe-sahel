-- Safe Sahel — check-in/check-out inventory handover.
--
-- The flow the product asked for: at check-in the owner photographs every
-- inventory item (proof it's there and working); at check-out they
-- photograph the same items again (proof nothing's missing/broken). An
-- admin reviews the before/after photos and, if something's wrong, records
-- a deduction against the guest's security deposit before resolving.
--
-- This models the real workflow (records + evidence + an admin decision) —
-- it does NOT move money. There's still no payment gateway wired up
-- (Paymob/Kashier), so deposits/refunds are recorded outcomes an admin
-- (or owner) acts on manually, same as booking confirmation already is.

create type public.handover_stage as enum ('check_in', 'check_out');
create type public.handover_status as enum (
  'pending', 'check_in_done', 'check_out_done', 'under_review', 'resolved'
);

create table public.booking_handovers (
  booking_id uuid primary key references public.bookings (id) on delete cascade,
  status public.handover_status not null default 'pending',
  check_in_completed_at timestamptz,
  check_out_completed_at timestamptz,
  deduction_amount numeric(10, 2) not null default 0,
  deduction_reason text,
  refund_amount numeric(10, 2),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  updated_at timestamptz not null default now()
);

create trigger set_booking_handovers_updated_at
  before update on public.booking_handovers
  for each row execute procedure public.set_updated_at();

alter table public.booking_handovers enable row level security;

create policy "Owners manage the handover for bookings on their properties"
  on public.booking_handovers for all
  using (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_id and p.owner_id = auth.uid()
    )
  );

create policy "Guests view the handover on their own booking"
  on public.booking_handovers for select
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.guest_id = auth.uid()));

create policy "Admins manage every handover"
  on public.booking_handovers for all
  using (public.is_admin())
  with check (public.is_admin());

create table public.booking_handover_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  inventory_item_id uuid not null references public.property_inventory_items (id) on delete cascade,
  stage public.handover_stage not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (booking_id, inventory_item_id, stage)
);

create index booking_handover_photos_booking_id_idx on public.booking_handover_photos (booking_id);

alter table public.booking_handover_photos enable row level security;

create policy "Owners manage handover photos for bookings on their properties"
  on public.booking_handover_photos for all
  using (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.bookings b
      join public.properties p on p.id = b.property_id
      where b.id = booking_id and p.owner_id = auth.uid()
    )
  );

create policy "Guests view handover photos on their own booking"
  on public.booking_handover_photos for select
  using (exists (select 1 from public.bookings b where b.id = booking_id and b.guest_id = auth.uid()));

create policy "Admins manage every handover photo"
  on public.booking_handover_photos for all
  using (public.is_admin())
  with check (public.is_admin());

-- Public bucket — these are photos of furniture/appliances (TV, kettle,
-- towels...), not identity documents, so they don't need the private +
-- signed-URL treatment verification-documents gets. Path convention:
-- {owner_id}/{booking_id}/{stage}/{item_id}-{filename}.
insert into storage.buckets (id, name, public)
values ('handover-photos', 'handover-photos', true)
on conflict (id) do nothing;

create policy "Handover photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'handover-photos');

create policy "Owners upload handover photos under their own folder"
  on storage.objects for insert
  with check (
    bucket_id = 'handover-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Owners delete their own handover photo uploads"
  on storage.objects for delete
  using (
    bucket_id = 'handover-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
