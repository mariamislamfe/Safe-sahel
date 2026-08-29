-- Safe Sahel — booking/availability schema + role-aware signup (Phase 2)
--
-- Adds availability, bookings, and the manual-confirm interim status flow
-- used until a real payment provider is connected (see project notes).
-- Also updates handle_new_user() so a signup can choose guest vs owner.

-- Let signup metadata set the initial role (guest|owner), defaulting to
-- guest for anything else/missing — replaces the Phase 0 version of this
-- function, which only read full_name.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when requested_role in ('owner', 'guest') then requested_role::public.user_role else 'guest' end
  );
  return new;
end;
$$;

create type public.booking_type as enum ('overnight', 'day_use');
create type public.booking_status as enum ('pending_payment', 'confirmed', 'cancelled', 'completed', 'declined');
create type public.availability_reason as enum ('owner_blocked', 'pending_hold', 'booked');

create extension if not exists btree_gist;

create table public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  range daterange not null,
  reason public.availability_reason not null,
  booking_id uuid,
  created_at timestamptz not null default now(),
  -- The actual double-booking guard: no two rows for the same property can
  -- cover overlapping dates, enforced by Postgres itself, not just app code.
  exclude using gist (property_id with =, range with &&)
);

create index availability_blocks_property_id_idx on public.availability_blocks (property_id);

alter table public.availability_blocks enable row level security;

create policy "Owners view their own availability blocks"
  on public.availability_blocks for select
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create policy "Anyone can see date ranges are taken (no details) on published properties"
  on public.availability_blocks for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.status = 'published' and p.deleted_at is null
    )
  );

create policy "Owners manage manual blocks on their own properties"
  on public.availability_blocks for all
  using (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
    and reason = 'owner_blocked'
  )
  with check (
    exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
    and reason = 'owner_blocked'
  );

-- bookings -----------------------------------------------------------------

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  guest_id uuid not null references public.profiles (id) on delete restrict,
  booking_type public.booking_type not null default 'overnight',
  check_in date not null,
  check_out date not null,
  guests_count smallint not null default 1,
  nights smallint not null,
  base_price numeric(10, 2) not null,
  deposit_amount numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null,
  status public.booking_status not null default 'pending_payment',
  guest_note text,
  owner_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  cancelled_at timestamptz,
  constraint check_out_after_check_in check (check_out > check_in)
);

create index bookings_property_id_idx on public.bookings (property_id);
create index bookings_guest_id_idx on public.bookings (guest_id);
create index bookings_status_idx on public.bookings (status);

alter table public.bookings enable row level security;

create policy "Guests view their own bookings"
  on public.bookings for select
  using (auth.uid() = guest_id);

create policy "Owners view bookings on their own properties"
  on public.bookings for select
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create policy "Guests can request a booking"
  on public.bookings for insert
  with check (auth.uid() = guest_id);

create policy "Owners can update bookings on their own properties"
  on public.bookings for update
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create policy "Guests can cancel their own pending bookings"
  on public.bookings for update
  using (auth.uid() = guest_id and status = 'pending_payment');

create trigger set_bookings_updated_at
  before update on public.bookings
  for each row execute procedure public.set_updated_at();

alter table public.availability_blocks
  add constraint availability_blocks_booking_id_fkey
  foreign key (booking_id) references public.bookings (id) on delete cascade;

-- platform_settings ---------------------------------------------------------
-- Config the admin panel edits later — never hardcode business numbers.

create table public.platform_settings (
  key text primary key,
  value jsonb not null
);

alter table public.platform_settings enable row level security;

create policy "Platform settings are viewable by everyone"
  on public.platform_settings for select
  using (true);

insert into public.platform_settings (key, value) values
  ('deposit_percentage', '20'),
  ('owner_subscription_price_egp', '500')
on conflict (key) do nothing;

-- reviews --------------------------------------------------------------

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  rating_overall smallint not null,
  rating_cleanliness smallint not null,
  rating_accuracy smallint not null,
  rating_location smallint not null,
  rating_value smallint not null,
  comment text,
  created_at timestamptz not null default now(),
  constraint ratings_in_range check (
    rating_overall between 1 and 5
    and rating_cleanliness between 1 and 5
    and rating_accuracy between 1 and 5
    and rating_location between 1 and 5
    and rating_value between 1 and 5
  )
);

create index reviews_property_id_idx on public.reviews (property_id);

alter table public.reviews enable row level security;

create policy "Reviews are viewable by everyone"
  on public.reviews for select
  using (true);

-- A review is allowed once a confirmed stay's check-out date has passed —
-- there's no scheduled job flipping bookings to 'completed', so gating on
-- that status would block reviews forever. The unique constraint on
-- booking_id above is what actually prevents duplicate reviews.
create policy "Guests can review their own stays after check-out"
  on public.reviews for insert
  with check (
    auth.uid() = guest_id
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.guest_id = auth.uid()
        and b.status = 'confirmed'
        and b.check_out < current_date
    )
  );

-- favorites --------------------------------------------------------------

create table public.favorites (
  guest_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guest_id, property_id)
);

alter table public.favorites enable row level security;

create policy "Guests manage their own favorites"
  on public.favorites for all
  using (auth.uid() = guest_id)
  with check (auth.uid() = guest_id);
