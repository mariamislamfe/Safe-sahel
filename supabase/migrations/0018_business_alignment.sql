-- Safe Sahel — business alignment (trust, booking requests, subscriptions,
-- ID security, analytics, dashboards).
--
-- Run AFTER 0017_booking_status_values.sql. Reverse with
-- supabase/migrations/down/0018_business_alignment.down.sql.
--
-- Design notes
-- • Every state transition that encodes a business rule (booking request /
--   confirm / decline / cancel / expire, strikes, payments, featured slots,
--   verification review, guest-ID registration, document access) is a
--   SECURITY DEFINER function. Clients no longer write those tables directly,
--   so the rules can't be bypassed from the browser.
-- • "Trusted writer" = an admin, or a statement running inside one of those
--   definer functions (current_user is then the function owner, not
--   'authenticated'). Guard triggers below are SECURITY INVOKER on purpose so
--   they can tell the difference.
-- • Nothing user-facing is hard-deleted. Listings are unpublished with a
--   reason; data moves are recorded in data_migration_log so the down
--   migration can restore them. The only rows ever deleted are
--   availability_blocks (derived date locks, recreated from bookings) and
--   guest-ID *files* after their legal retention window (the metadata row
--   is kept with purged_at set).

-- ===========================================================================
-- 0. Helpers
-- ===========================================================================

create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.setting(p_key text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select value::jsonb from public.platform_settings where key = p_key;
$$;

create or replace function public.setting_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer set search_path = public
as $$
  select coalesce((public.setting(p_key) #>> '{}')::integer, p_default);
$$;

create or replace function public.setting_ts(p_key text, p_default timestamptz)
returns timestamptz
language sql
stable
security definer set search_path = public
as $$
  select coalesce((public.setting(p_key) #>> '{}')::timestamptz, p_default);
$$;

-- SECURITY INVOKER on purpose: inside a definer function current_user is the
-- function owner (postgres), so writes made by our own RPCs count as trusted;
-- a browser session is 'authenticated'/'anon' and only trusted if admin.
create or replace function public.is_trusted_writer()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user not in ('authenticated', 'anon') or public.is_admin();
$$;

create or replace function public.normalize_unit(p_text text)
returns text
language sql
immutable
as $$
  select lower(regexp_replace(coalesce(p_text, ''), '[^[:alnum:]]', '', 'g'));
$$;

-- Audit trail for data this migration changes, so the down migration can
-- put every row back exactly as it was.
create table if not exists public.data_migration_log (
  id bigint generated always as identity primary key,
  migration text not null,
  entity text not null,
  entity_id uuid not null,
  field text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);
alter table public.data_migration_log enable row level security;
create policy "Admins view data migration log"
  on public.data_migration_log for select using (public.is_admin());

-- ===========================================================================
-- 1. Settings (business numbers live in the DB, never in code)
-- ===========================================================================

insert into public.platform_settings (key, value) values
  -- Everything is free until this instant (Cairo time).
  ('free_until', '"2027-04-01T00:00:00+02:00"'),
  -- Founding Host = became a host before this instant.
  ('founding_cutoff', '"2027-04-01T00:00:00+02:00"'),
  -- TODO(founder): "year 1" launch pricing assumed to run 1 Apr 2027 → 1 Apr 2028.
  ('launch_pricing_until', '"2028-04-01T00:00:00+02:00"'),
  -- TODO(founder): founders keep launch prices "for 2 years" — assumed to
  -- mean 2 years of paid service, i.e. until 1 Apr 2029.
  ('founder_price_lock_until', '"2029-04-01T00:00:00+02:00"'),
  ('grace_days', '7'),
  ('expiry_reminder_days', '7'),
  ('booking_expiry_hours', '24'),
  ('strike_flag_threshold', '2'),
  ('guest_id_retention_days', '30'),
  ('featured_max_per_compound', '3'),
  ('founder_featured_days', '30'),
  ('min_listing_photos', '5'),
  ('guarantee_window_days', '30'),
  ('broker_discounts', '[{"min": 10, "pct": 25}, {"min": 5, "pct": 15}]'),
  ('tier_thresholds', '{"premium_from": 5000, "luxury_above": 8000}'),
  -- TODO(founder): fill in the real InstaPay handle/number + account name.
  ('instapay', '{"handle": "safesahel@instapay", "account_name": "Safe Sahel", "phone": "01123094983"}'),
  ('verified_target', '{"total": 100, "milestones": [{"date": "2026-12-31", "count": 20}, {"date": "2027-01-31", "count": 45}, {"date": "2027-02-28", "count": 75}, {"date": "2027-03-31", "count": 100}]}')
on conflict (key) do nothing;

create table public.subscription_prices (
  plan text not null check (plan in ('monthly', 'season', 'annual', 'student_winter', 'featured_week')),
  tier text not null check (tier in ('launch', 'basic', 'premium', 'luxury')),
  price_egp integer not null check (price_egp >= 0),
  updated_at timestamptz not null default now(),
  primary key (plan, tier)
);
alter table public.subscription_prices enable row level security;
create policy "Subscription prices are public" on public.subscription_prices for select using (true);
create policy "Admins manage subscription prices" on public.subscription_prices for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.subscription_prices (plan, tier, price_egp) values
  ('monthly', 'launch', 500), ('season', 'launch', 2000), ('annual', 'launch', 4500),
  ('student_winter', 'launch', 2500), ('featured_week', 'launch', 300),
  ('monthly', 'basic', 1000), ('season', 'basic', 4000), ('annual', 'basic', 9000),
  ('student_winter', 'basic', 5000), ('featured_week', 'basic', 300),
  ('monthly', 'premium', 1500), ('season', 'premium', 6000), ('annual', 'premium', 13500),
  ('student_winter', 'premium', 5000), ('featured_week', 'premium', 300),
  ('monthly', 'luxury', 2000), ('season', 'luxury', 8000), ('annual', 'luxury', 18000),
  ('student_winter', 'luxury', 5000), ('featured_week', 'luxury', 300)
on conflict (plan, tier) do nothing;

-- ===========================================================================
-- 2. Profiles: legal name, host type, founding date, revocation
-- ===========================================================================

alter table public.profiles add column legal_name text;
alter table public.profiles add column host_type text check (host_type in ('owner', 'broker'));
alter table public.profiles add column host_since timestamptz;
alter table public.profiles add column verification_revoked_at timestamptz;
alter table public.profiles add column verification_revoked_reason text;

update public.profiles set host_since = created_at where role in ('owner', 'admin') and host_since is null;

-- Replaces the 0006 version (which was SECURITY DEFINER and only protected
-- `verified`). Now invoker + covers every admin-controlled column.
create or replace function public.prevent_self_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_trusted_writer() then
    new.verified := old.verified;
    new.legal_name := old.legal_name;
    new.host_type := old.host_type;
    new.host_since := old.host_since;
    new.verification_revoked_at := old.verification_revoked_at;
    new.verification_revoked_reason := old.verification_revoked_reason;
  end if;
  return new;
end;
$$;

create or replace function public.stamp_host_since()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.role in ('owner', 'admin') and new.host_since is null then
    new.host_since := now();
  end if;
  return new;
end;
$$;

-- "zz_" so it runs after prevent_self_verification_trigger (same-timing
-- triggers fire in name order).
create trigger zz_stamp_host_since
  before insert or update on public.profiles
  for each row execute procedure public.stamp_host_since();

create or replace function public.is_founding_host(p_profile_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select host_since < public.setting_ts('founding_cutoff', '2027-04-01T00:00:00+02:00')
     from public.profiles where id = p_profile_id),
    false
  );
$$;

-- Public badges without exposing the profiles table.
create or replace function public.host_badges(p_owner_ids uuid[])
returns table (owner_id uuid, verified boolean, host_type text, founding boolean)
language sql
stable
security definer set search_path = public
as $$
  select p.id, p.verified, p.host_type,
         coalesce(p.host_since < public.setting_ts('founding_cutoff', '2027-04-01T00:00:00+02:00'), false)
  from public.profiles p
  where p.id = any (p_owner_ids);
$$;

-- ===========================================================================
-- 3. Compounds: focus compounds, Arabic names, merge support
-- ===========================================================================

alter table public.compounds add column name_ar text;
alter table public.compounds add column is_focus boolean not null default false;
alter table public.compounds add column focus_rank smallint;
alter table public.compounds add column hidden boolean not null default false;
alter table public.compounds add column merged_into uuid references public.compounds (id);

-- ===========================================================================
-- 4. Properties: publish gate fields, student/monthly rental, unit address
-- ===========================================================================

alter table public.properties add column unit_address text;
alter table public.properties add column monthly_rental_enabled boolean not null default false;
alter table public.properties add column monthly_price numeric(10, 2);
alter table public.properties add column unpublished_reason text;
alter table public.properties add column first_published_at timestamptz;
alter table public.properties add column calendar_updated_at timestamptz;
alter table public.properties add column flagged_for_review boolean not null default false;
alter table public.properties add column flag_reason text;
alter table public.properties add column flagged_at timestamptz;
alter table public.properties add constraint monthly_price_requires_flag
  check (not monthly_rental_enabled or (monthly_price is not null and monthly_price > 0));

update public.properties set first_published_at = created_at
where status = 'published' and first_published_at is null;

-- The same chalet can't be listed twice: an exact (normalised) unit address
-- in the same compound is a hard block; fuzzy matches are flagged instead.
create unique index properties_unique_unit_per_compound
  on public.properties (compound_id, public.normalize_unit(unit_address))
  where deleted_at is null and unit_address is not null and public.normalize_unit(unit_address) <> '';

alter table public.property_images add column content_hash text;
create index property_images_content_hash_idx on public.property_images (content_hash) where content_hash is not null;

-- Subscriptions are now per-plan records (below); the old single-flag gate
-- is replaced by the publish trigger. Columns are kept (unused) so the down
-- migration is lossless.
alter table public.properties drop constraint if exists published_requires_active_subscription;

-- Hard delete → archive (soft delete via deleted_at).
drop policy if exists "Owners can delete their own properties" on public.properties;

-- Replaces 0009's version: now invoker, protects more columns, and stops an
-- owner lifting an admin suspension or re-assigning ownership.
create or replace function public.prevent_self_property_admin_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not public.is_trusted_writer() then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.featured := false;
      new.flagged_for_review := false;
      new.flag_reason := null;
      new.flagged_at := null;
      new.first_published_at := null;
      if new.status = 'suspended' then
        new.status := 'draft';
      end if;
    else
      new.verified := old.verified;
      new.featured := old.featured;
      new.flagged_for_review := old.flagged_for_review;
      new.flag_reason := old.flag_reason;
      new.flagged_at := old.flagged_at;
      new.first_published_at := old.first_published_at;
      new.owner_id := old.owner_id;
      if old.status = 'suspended' then
        new.status := 'suspended';
        new.unpublished_reason := old.unpublished_reason;
      elsif new.status = 'suspended' then
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ===========================================================================
-- 5. Verification (owners + brokers) and broker authorizations
-- ===========================================================================

alter table public.verification_requests add column kind text not null default 'owner'
  check (kind in ('owner', 'broker'));
alter table public.verification_requests add column ownership_proof_path text;
alter table public.verification_requests add column ownership_proof_type text
  check (ownership_proof_type in ('compound_card', 'maintenance_bill'));
alter table public.verification_requests add column rejection_reason text;
alter table public.verification_requests add column consent_at timestamptz;
alter table public.verification_requests add column consent_version text;
alter table public.verification_requests add column reviewed_by uuid references public.profiles (id);
alter table public.verification_requests alter column sahel_location drop not null;

create or replace function public.guard_verification_request()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and not public.is_trusted_writer() then
    new.status := 'pending';
    new.admin_notes := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
    if new.consent_at is null then
      raise exception 'consent_required';
    end if;
    -- Paths must live in the uploader's own folder.
    if split_part(new.id_document_url, '/', 1) <> auth.uid()::text
       or (new.ownership_proof_path is not null and split_part(new.ownership_proof_path, '/', 1) <> auth.uid()::text) then
      raise exception 'invalid_document_path';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_verification_request_trigger
  before insert on public.verification_requests
  for each row execute procedure public.guard_verification_request();

create table public.broker_authorizations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  broker_id uuid not null references public.profiles (id) on delete restrict,
  document_path text not null,
  owner_full_name text not null,
  owner_phone text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  consent_at timestamptz not null,
  consent_version text not null,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index broker_authorizations_property_idx on public.broker_authorizations (property_id);
alter table public.broker_authorizations enable row level security;

create policy "Brokers view their own authorizations"
  on public.broker_authorizations for select using (auth.uid() = broker_id);
create policy "Brokers submit authorizations for their own listings"
  on public.broker_authorizations for insert
  with check (
    auth.uid() = broker_id
    and split_part(document_path, '/', 1) = auth.uid()::text
    and exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );
create policy "Admins manage broker authorizations"
  on public.broker_authorizations for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.guard_broker_authorization()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and not public.is_trusted_writer() then
    new.status := 'pending';
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.rejection_reason := null;
  end if;
  return new;
end;
$$;
create trigger guard_broker_authorization_trigger
  before insert on public.broker_authorizations
  for each row execute procedure public.guard_broker_authorization();

-- ===========================================================================
-- 6. Subscriptions, payments, featured slots
-- ===========================================================================

create table public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  kind text not null check (kind in ('subscription', 'featured')),
  plan text check (plan in ('monthly', 'season', 'annual', 'student_winter')),
  property_ids uuid[] not null,
  featured_weeks smallint,
  amount_egp integer not null check (amount_egp >= 0),
  quoted_breakdown jsonb,
  instapay_reference text not null,
  proof_path text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index subscription_payments_owner_idx on public.subscription_payments (owner_id);
create index subscription_payments_status_idx on public.subscription_payments (status);
alter table public.subscription_payments enable row level security;
create policy "Owners view their own payments"
  on public.subscription_payments for select using (auth.uid() = owner_id);
create policy "Admins view all payments"
  on public.subscription_payments for select using (public.is_admin());

create table public.listing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  owner_id uuid not null references public.profiles (id) on delete restrict,
  plan text not null check (plan in ('monthly', 'season', 'annual', 'student_winter')),
  tier text not null check (tier in ('launch', 'basic', 'premium', 'luxury')),
  price_egp integer not null,
  discount_pct smallint not null default 0,
  amount_egp integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  source text not null default 'payment' check (source in ('payment', 'admin')),
  payment_id uuid references public.subscription_payments (id),
  is_founder_rate boolean not null default false,
  guarantee_extended_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint subscription_period_valid check (ends_at > starts_at)
);
create index listing_subscriptions_property_idx on public.listing_subscriptions (property_id, ends_at);
create index listing_subscriptions_owner_idx on public.listing_subscriptions (owner_id);
alter table public.listing_subscriptions enable row level security;
create policy "Owners view their own subscriptions"
  on public.listing_subscriptions for select using (auth.uid() = owner_id);
create policy "Admins view all subscriptions"
  on public.listing_subscriptions for select using (public.is_admin());

create table public.featured_slots (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  compound_id uuid references public.compounds (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  source text not null check (source in ('payment', 'founder_free', 'admin')),
  payment_id uuid references public.subscription_payments (id),
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  constraint featured_period_valid check (ends_at > starts_at)
);
create index featured_slots_active_idx on public.featured_slots (compound_id, ends_at) where cancelled_at is null;
alter table public.featured_slots enable row level security;
create policy "Featured slots are public" on public.featured_slots for select using (cancelled_at is null);
create policy "Admins view all featured slots" on public.featured_slots for select using (public.is_admin());
create policy "Admins update featured slots" on public.featured_slots for update
  using (public.is_admin()) with check (public.is_admin());

-- Coverage: listing may be public while free, or within an active plan + grace.
create or replace function public.property_has_coverage(p_property_id uuid, p_at timestamptz default now())
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select p_at < public.setting_ts('free_until', '2027-04-01T00:00:00+02:00')
                + make_interval(days => public.setting_int('grace_days', 7))
    or exists (
      select 1 from public.listing_subscriptions s
      where s.property_id = p_property_id
        and s.status = 'active'
        and s.starts_at <= p_at
        and s.ends_at + make_interval(days => public.setting_int('grace_days', 7)) > p_at
    );
$$;

create or replace function public.pricing_tier_for(p_owner_id uuid, p_price numeric, p_at timestamptz default now())
returns text
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_th jsonb := coalesce(public.setting('tier_thresholds'), '{"premium_from": 5000, "luxury_above": 8000}'::jsonb);
begin
  if p_at < public.setting_ts('launch_pricing_until', '2028-04-01T00:00:00+02:00') then
    return 'launch';
  end if;
  if public.is_founding_host(p_owner_id)
     and p_at < public.setting_ts('founder_price_lock_until', '2029-04-01T00:00:00+02:00') then
    return 'launch';
  end if;
  if p_price < (v_th ->> 'premium_from')::numeric then
    return 'basic';
  elsif p_price <= (v_th ->> 'luxury_above')::numeric then
    return 'premium';
  end if;
  return 'luxury';
end;
$$;

create or replace function public.broker_discount_pct(p_owner_id uuid)
returns integer
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_count integer;
  v_rule jsonb;
begin
  if coalesce((select host_type from public.profiles where id = p_owner_id), 'owner') <> 'broker' then
    return 0;
  end if;
  select count(*) into v_count from public.properties where owner_id = p_owner_id and deleted_at is null;
  for v_rule in
    select r.value from jsonb_array_elements(coalesce(public.setting('broker_discounts'), '[]'::jsonb)) as r(value)
    order by (r.value ->> 'min')::integer desc
  loop
    if v_count >= (v_rule ->> 'min')::integer then
      return (v_rule ->> 'pct')::integer;
    end if;
  end loop;
  return 0;
end;
$$;

-- Price quote is computed server-side so an owner can never under-declare.
create or replace function public.quote_subscription(p_property_ids uuid[], p_plan text)
returns table (
  property_id uuid,
  title text,
  nightly_price numeric,
  tier text,
  list_price integer,
  discount_pct integer,
  amount integer,
  founder_rate boolean,
  included_free boolean
)
language plpgsql
stable
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_discount integer;
  v_founder boolean;
  v_launch_over boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_plan not in ('monthly', 'season', 'annual', 'student_winter') then
    raise exception 'invalid_plan';
  end if;
  v_discount := public.broker_discount_pct(v_uid);
  v_founder := public.is_founding_host(v_uid);
  v_launch_over := now() >= public.setting_ts('launch_pricing_until', '2028-04-01T00:00:00+02:00');

  return query
  select
    p.id,
    p.title,
    p.price_per_night,
    t.tier,
    sp.price_egp,
    v_discount,
    case when inc.included then 0 else round(sp.price_egp * (100 - v_discount) / 100.0)::integer end,
    (t.tier = 'launch' and v_founder and v_launch_over),
    inc.included
  from public.properties p
  cross join lateral (select public.pricing_tier_for(p.owner_id, p.price_per_night) as tier) t
  join public.subscription_prices sp on sp.plan = p_plan and sp.tier = t.tier
  cross join lateral (
    select (
      p_plan = 'student_winter'
      and exists (
        select 1 from public.listing_subscriptions s
        where s.property_id = p.id and s.plan = 'annual' and s.status = 'active' and s.ends_at > now()
      )
    ) as included
  ) inc
  where p.id = any (p_property_ids) and p.owner_id = v_uid and p.deleted_at is null;
end;
$$;

-- Plan windows (Cairo time). Paid time never overlaps the free period.
-- TODO(founder): season = 1 May → 1 Oct and student winter = 1 Oct → 1 May
-- are fixed windows; buying mid-window covers the rest of that window.
create or replace function public.plan_period(
  p_plan text,
  p_property_id uuid,
  p_from timestamptz default now(),
  out starts_at timestamptz,
  out ends_at timestamptz
)
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_floor timestamptz := greatest(p_from, public.setting_ts('free_until', '2027-04-01T00:00:00+02:00'));
  v_latest timestamptz;
  v_year integer;
begin
  if p_plan in ('monthly', 'annual') then
    select max(s.ends_at) into v_latest
    from public.listing_subscriptions s
    where s.property_id = p_property_id and s.status = 'active'
      and s.plan in ('monthly', 'annual', 'season') and s.ends_at > v_floor;
    starts_at := greatest(v_floor, coalesce(v_latest, v_floor));
    ends_at := starts_at + case when p_plan = 'monthly' then interval '1 month' else interval '12 months' end;
  elsif p_plan = 'season' then
    v_year := extract(year from (v_floor at time zone 'Africa/Cairo'))::integer;
    loop
      ends_at := make_timestamptz(v_year, 10, 1, 0, 0, 0, 'Africa/Cairo');
      exit when ends_at > v_floor + interval '30 days';
      v_year := v_year + 1;
    end loop;
    starts_at := greatest(v_floor, make_timestamptz(v_year, 5, 1, 0, 0, 0, 'Africa/Cairo'));
  elsif p_plan = 'student_winter' then
    v_year := extract(year from (v_floor at time zone 'Africa/Cairo'))::integer - 1;
    loop
      ends_at := make_timestamptz(v_year + 1, 5, 1, 0, 0, 0, 'Africa/Cairo');
      exit when ends_at > v_floor + interval '30 days';
      v_year := v_year + 1;
    end loop;
    starts_at := greatest(v_floor, make_timestamptz(v_year, 10, 1, 0, 0, 0, 'Africa/Cairo'));
  else
    raise exception 'invalid_plan';
  end if;
end;
$$;

-- ===========================================================================
-- 7. Publish gate
-- ===========================================================================

create or replace function public.listing_blockers(p_property_id uuid, p_owner_id uuid, p_price numeric)
returns text[]
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_blockers text[] := '{}';
  v_photos integer;
  v_verified boolean;
  v_host_type text;
begin
  select count(*) into v_photos from public.property_images where property_id = p_property_id;
  if v_photos < public.setting_int('min_listing_photos', 5) then
    v_blockers := array_append(v_blockers, 'min_photos');
  end if;
  if p_price is null or p_price <= 0 then
    v_blockers := array_append(v_blockers, 'missing_price');
  end if;

  select verified, coalesce(host_type, 'owner') into v_verified, v_host_type
  from public.profiles where id = p_owner_id;

  if v_host_type = 'broker' then
    if not coalesce(v_verified, false) then
      v_blockers := array_append(v_blockers, 'broker_not_approved');
    end if;
    if not exists (
      select 1 from public.broker_authorizations ba
      where ba.property_id = p_property_id and ba.broker_id = p_owner_id and ba.status = 'approved'
    ) then
      v_blockers := array_append(v_blockers, 'missing_authorization');
    end if;
  elsif not coalesce(v_verified, false) then
    v_blockers := array_append(v_blockers, 'owner_not_verified');
  end if;

  if not public.property_has_coverage(p_property_id) then
    v_blockers := array_append(v_blockers, 'no_subscription');
  end if;
  return v_blockers;
end;
$$;

-- For the owner dashboard: "why isn't my listing live?"
create or replace function public.property_publish_blockers(p_property_id uuid)
returns text[]
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_owner uuid;
  v_price numeric;
begin
  select owner_id, price_per_night into v_owner, v_price from public.properties where id = p_property_id;
  if v_owner is null or (v_owner <> auth.uid() and not public.is_admin()) then
    return null;
  end if;
  return public.listing_blockers(p_property_id, v_owner, v_price);
end;
$$;

create or replace function public.enforce_listing_publishable()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_blockers text[];
begin
  if new.status = 'published'
     and (tg_op = 'INSERT'
          or old.status is distinct from 'published'
          or new.price_per_night is distinct from old.price_per_night) then
    v_blockers := public.listing_blockers(new.id, new.owner_id, new.price_per_night);
    if coalesce(array_length(v_blockers, 1), 0) > 0 then
      raise exception 'listing_not_publishable:%', array_to_string(v_blockers, ',');
    end if;
  end if;
  if new.status = 'published' then
    new.unpublished_reason := null;
    if new.first_published_at is null then
      new.first_published_at := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger zz_enforce_listing_publishable
  before insert or update on public.properties
  for each row execute procedure public.enforce_listing_publishable();

-- Demote a published listing that no longer qualifies (photos removed,
-- verification revoked, subscription lapsed past grace…).
create or replace function public.refresh_listing_visibility(p_property_id uuid)
returns text[]
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
  v_price numeric;
  v_status public.property_status;
  v_blockers text[];
begin
  select owner_id, price_per_night, status into v_owner, v_price, v_status
  from public.properties where id = p_property_id and deleted_at is null;
  if v_owner is null or v_status <> 'published' then
    return null;
  end if;
  v_blockers := public.listing_blockers(p_property_id, v_owner, v_price);
  if coalesce(array_length(v_blockers, 1), 0) > 0 then
    update public.properties
    set status = 'draft', unpublished_reason = array_to_string(v_blockers, ',')
    where id = p_property_id;
    insert into public.notifications (recipient_id, kind, payload)
    values (v_owner, 'listing_hidden', jsonb_build_object('property_id', p_property_id, 'reasons', v_blockers));
  end if;
  return v_blockers;
end;
$$;

create or replace function public.on_property_image_removed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.refresh_listing_visibility(old.property_id);
  return null;
end;
$$;
create trigger property_image_removed_trigger
  after delete on public.property_images
  for each row execute procedure public.on_property_image_removed();

create or replace function public.on_profile_verification_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_pid uuid;
begin
  if new.verified is distinct from old.verified or new.host_type is distinct from old.host_type then
    update public.properties set verified = new.verified where owner_id = new.id;
    for v_pid in select id from public.properties where owner_id = new.id and status = 'published' loop
      perform public.refresh_listing_visibility(v_pid);
    end loop;
  end if;
  return null;
end;
$$;
create trigger profile_verification_change_trigger
  after update on public.profiles
  for each row execute procedure public.on_profile_verification_change();

create or replace function public.on_broker_authorization_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.refresh_listing_visibility(new.property_id);
  end if;
  return null;
end;
$$;
create trigger broker_authorization_change_trigger
  after update on public.broker_authorizations
  for each row execute procedure public.on_broker_authorization_change();

-- ===========================================================================
-- 8. Notifications outbox (in-app + email via the cron route)
-- ===========================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  channel text not null default 'email' check (channel in ('email', 'in_app')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  send_error text,
  read_at timestamptz
);
create index notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index notifications_unsent_idx on public.notifications (created_at) where sent_at is null;
alter table public.notifications enable row level security;
create policy "Users view their own notifications"
  on public.notifications for select using (auth.uid() = recipient_id);
create policy "Users mark their own notifications read"
  on public.notifications for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);
create policy "Admins view all notifications"
  on public.notifications for select using (public.is_admin());

-- ===========================================================================
-- 9. Bookings: request → confirm/decline/expire/cancel
-- ===========================================================================

create or replace function public.generate_booking_reference()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_ref text;
begin
  loop
    v_ref := 'SS-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from public.bookings where reference = v_ref);
  end loop;
  return v_ref;
end;
$$;

alter table public.bookings add column reference text;
alter table public.bookings add column adults_count smallint;
alter table public.bookings add column expires_at timestamptz;
alter table public.bookings add column confirmed_at timestamptz;
alter table public.bookings add column declined_at timestamptz;
alter table public.bookings add column expired_at timestamptz;
alter table public.bookings add column decline_reason text;
alter table public.bookings add column cancelled_by text check (cancelled_by in ('guest', 'owner', 'admin', 'system'));
alter table public.bookings add column cancellation_reason text;

update public.bookings set reference = public.generate_booking_reference() where reference is null;
update public.bookings set adults_count = guests_count where adults_count is null;
update public.bookings set confirmed_at = coalesce(confirmed_at, created_at) where status = 'confirmed';

alter table public.bookings alter column reference set default public.generate_booking_reference();
alter table public.bookings alter column reference set not null;
alter table public.bookings add constraint bookings_reference_key unique (reference);

-- Old "awaiting payment" requests become pending requests with a fresh 24h
-- window, and their date holds are released (dates block only on confirm).
insert into public.data_migration_log (migration, entity, entity_id, field, old_value, new_value)
select '0018', 'bookings', id, 'status', status::text, 'pending'
from public.bookings where status = 'pending_payment';
update public.bookings
set status = 'pending', expires_at = now() + interval '24 hours'
where status = 'pending_payment';
delete from public.availability_blocks where reason = 'pending_hold';

alter table public.bookings alter column status set default 'pending';

-- Clients no longer write bookings / booking-linked date blocks directly.
drop policy if exists "Guests can request a booking" on public.bookings;
drop policy if exists "Guests can cancel their own booking" on public.bookings;
drop policy if exists "Guests can cancel their own pending bookings" on public.bookings;
drop policy if exists "Owners can update bookings on their own properties" on public.bookings;
drop policy if exists "Guests create the hold for their own booking" on public.availability_blocks;
drop policy if exists "Guests create a pending hold for their own booking" on public.availability_blocks;
drop policy if exists "Guests remove the hold on their own booking" on public.availability_blocks;
drop policy if exists "Guests remove the hold on their own pending booking" on public.availability_blocks;
drop policy if exists "Owners confirm or release holds tied to bookings on their properties" on public.availability_blocks;
drop policy if exists "Owners delete holds tied to bookings on their properties" on public.availability_blocks;

create table public.owner_strikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete restrict,
  property_id uuid references public.properties (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete restrict,
  reason text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles (id),
  revoke_reason text
);
create index owner_strikes_owner_idx on public.owner_strikes (owner_id);
alter table public.owner_strikes enable row level security;
create policy "Owners view their own strikes" on public.owner_strikes for select using (auth.uid() = owner_id);
create policy "Admins manage strikes" on public.owner_strikes for all using (public.is_admin()) with check (public.is_admin());

-- Analytics events (written only by definer functions).
create table public.listing_events (
  id bigint generated always as identity primary key,
  property_id uuid references public.properties (id) on delete restrict,
  compound_id uuid references public.compounds (id),
  event text not null check (event in ('view', 'whatsapp_click', 'booking_request', 'booking_confirmed', 'site_visit')),
  session_id text,
  user_id uuid,
  booking_id uuid,
  value_egp numeric(12, 2),
  created_at timestamptz not null default now()
);
create index listing_events_property_idx on public.listing_events (property_id, event, created_at);
create index listing_events_event_idx on public.listing_events (event, created_at);
create index listing_events_compound_idx on public.listing_events (compound_id, event, created_at);
create index listing_events_session_idx on public.listing_events (session_id, event, created_at) where session_id is not null;
alter table public.listing_events enable row level security;
create policy "Admins view listing events" on public.listing_events for select using (public.is_admin());

create or replace function public.set_listing_event_compound()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.property_id is not null and new.compound_id is null then
    select compound_id into new.compound_id from public.properties where id = new.property_id;
  end if;
  return new;
end;
$$;
create trigger set_listing_event_compound_trigger
  before insert on public.listing_events
  for each row execute procedure public.set_listing_event_compound();

create or replace function public.expire_stale_bookings()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer := 0;
  v_row record;
begin
  for v_row in
    update public.bookings
    set status = 'expired', expired_at = now()
    where status = 'pending' and expires_at is not null and expires_at < now()
    returning id, guest_id, reference
  loop
    insert into public.notifications (recipient_id, kind, payload)
    values (v_row.guest_id, 'booking_expired', jsonb_build_object('booking_id', v_row.id, 'reference', v_row.reference));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.request_booking(
  p_property_id uuid,
  p_check_in date,
  p_check_out date,
  p_guests integer,
  p_adults integer default null,
  p_note text default null
)
returns table (booking_id uuid, reference text)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_price numeric;
  v_min_stay integer;
  v_max_guests integer;
  v_status public.property_status;
  v_deleted timestamptz;
  v_nights integer;
  v_base numeric;
  v_id uuid;
  v_ref text;
  v_adults integer := coalesce(p_adults, p_guests);
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  perform public.expire_stale_bookings();

  select owner_id, price_per_night, min_stay_nights, max_guests, status, deleted_at
  into v_owner, v_price, v_min_stay, v_max_guests, v_status, v_deleted
  from public.properties where id = p_property_id;

  if v_owner is null or v_status <> 'published' or v_deleted is not null then
    raise exception 'listing_unavailable';
  end if;
  if v_owner = v_uid then
    raise exception 'cannot_book_own_listing';
  end if;
  v_nights := p_check_out - p_check_in;
  if p_check_in < (now() at time zone 'Africa/Cairo')::date then
    raise exception 'check_in_in_past';
  end if;
  if v_nights <= 0 then
    raise exception 'invalid_dates';
  end if;
  if v_nights < v_min_stay then
    raise exception 'below_min_stay';
  end if;
  if p_guests < 1 or p_guests > v_max_guests then
    raise exception 'too_many_guests';
  end if;
  if v_adults < 1 or v_adults > p_guests then
    raise exception 'invalid_adults';
  end if;
  if exists (
    select 1 from public.availability_blocks ab
    where ab.property_id = p_property_id and ab.range && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'dates_unavailable';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.property_id = p_property_id and b.guest_id = v_uid and b.status = 'pending'
      and daterange(b.check_in, b.check_out, '[)') && daterange(p_check_in, p_check_out, '[)')
  ) then
    raise exception 'duplicate_request';
  end if;
  if (select count(*) from public.bookings b where b.guest_id = v_uid and b.status = 'pending') >= 5 then
    raise exception 'too_many_pending';
  end if;

  v_base := v_nights * v_price;
  insert into public.bookings (
    property_id, guest_id, check_in, check_out, guests_count, adults_count, nights,
    base_price, deposit_amount, total_amount, status, guest_note, expires_at
  ) values (
    p_property_id, v_uid, p_check_in, p_check_out, p_guests, v_adults, v_nights,
    v_base, round(v_price / 2), v_base + round(v_price / 2), 'pending', nullif(trim(p_note), ''),
    now() + make_interval(hours => public.setting_int('booking_expiry_hours', 24))
  )
  returning id, reference into v_id, v_ref;

  insert into public.listing_events (property_id, event, user_id, booking_id, value_egp)
  values (p_property_id, 'booking_request', v_uid, v_id, v_base);
  insert into public.notifications (recipient_id, kind, payload)
  values (v_owner, 'booking_request', jsonb_build_object(
    'booking_id', v_id, 'reference', v_ref, 'check_in', p_check_in, 'check_out', p_check_out));

  return query select v_id, v_ref;
end;
$$;

create or replace function public.respond_to_booking(p_booking_id uuid, p_decision text, p_note text default null)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_b record;
  v_other record;
begin
  perform public.expire_stale_bookings();

  select b.id, b.status, b.property_id, b.guest_id, b.check_in, b.check_out, b.base_price, b.reference,
         p.owner_id as prop_owner
  into v_b
  from public.bookings b join public.properties p on p.id = b.property_id
  where b.id = p_booking_id
  for update of b;

  if v_b.id is null then
    raise exception 'booking_not_found';
  end if;
  if v_b.prop_owner <> auth.uid() and not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  -- Returned (not raised) so the expiry that just happened above commits.
  if v_b.status = 'expired' then
    return 'expired';
  end if;
  if v_b.status <> 'pending' then
    raise exception 'booking_not_pending';
  end if;

  if p_decision = 'confirm' then
    begin
      insert into public.availability_blocks (property_id, range, reason, booking_id)
      values (v_b.property_id, daterange(v_b.check_in, v_b.check_out, '[)'), 'booked', v_b.id);
    exception when exclusion_violation then
      raise exception 'dates_unavailable';
    end;

    update public.bookings
    set status = 'confirmed', confirmed_at = now(), owner_note = coalesce(nullif(trim(p_note), ''), owner_note)
    where id = v_b.id;

    insert into public.listing_events (property_id, event, user_id, booking_id, value_egp)
    values (v_b.property_id, 'booking_confirmed', v_b.guest_id, v_b.id, v_b.base_price);
    insert into public.notifications (recipient_id, kind, payload)
    values (v_b.guest_id, 'booking_confirmed', jsonb_build_object('booking_id', v_b.id, 'reference', v_b.reference));

    -- Overlapping pending requests can no longer be honoured.
    for v_other in
      select id, guest_id, reference from public.bookings
      where property_id = v_b.property_id and status = 'pending' and id <> v_b.id
        and daterange(check_in, check_out, '[)') && daterange(v_b.check_in, v_b.check_out, '[)')
    loop
      update public.bookings
      set status = 'declined', declined_at = now(), decline_reason = 'dates_taken'
      where id = v_other.id;
      insert into public.notifications (recipient_id, kind, payload)
      values (v_other.guest_id, 'booking_declined', jsonb_build_object('booking_id', v_other.id, 'reference', v_other.reference));
    end loop;
    return 'confirmed';
  elsif p_decision = 'decline' then
    update public.bookings
    set status = 'declined', declined_at = now(), decline_reason = nullif(trim(p_note), '')
    where id = v_b.id;
    insert into public.notifications (recipient_id, kind, payload)
    values (v_b.guest_id, 'booking_declined', jsonb_build_object('booking_id', v_b.id, 'reference', v_b.reference));
    return 'declined';
  end if;
  raise exception 'invalid_decision';
end;
$$;

create or replace function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns text
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_b record;
  v_actor text;
  v_fee numeric := 0;
  v_today date := (now() at time zone 'Africa/Cairo')::date;
  v_strikes integer;
begin
  select b.id, b.status, b.property_id, b.guest_id, b.check_in, b.deposit_amount, b.reference,
         p.owner_id as prop_owner
  into v_b
  from public.bookings b join public.properties p on p.id = b.property_id
  where b.id = p_booking_id
  for update of b;

  if v_b.id is null then
    raise exception 'booking_not_found';
  end if;
  if v_b.guest_id = v_uid then
    v_actor := 'guest';
  elsif v_b.prop_owner = v_uid then
    v_actor := 'owner';
  elsif public.is_admin() then
    v_actor := 'admin';
  else
    raise exception 'not_authorized';
  end if;

  if v_b.status not in ('pending', 'confirmed') then
    raise exception 'booking_not_active';
  end if;
  if v_b.status = 'confirmed' and v_b.check_in <= v_today and v_actor <> 'admin' then
    raise exception 'stay_already_started';
  end if;

  -- An owner "cancelling" a request they never confirmed is just a decline.
  if v_actor = 'owner' and v_b.status = 'pending' then
    return public.respond_to_booking(p_booking_id, 'decline', p_reason);
  end if;

  if v_actor = 'guest' and v_b.status = 'confirmed' and v_b.check_in - v_today < 3 then
    v_fee := v_b.deposit_amount;
  end if;

  update public.bookings
  set status = 'cancelled', cancelled_at = now(), cancelled_by = v_actor,
      cancellation_reason = nullif(trim(p_reason), ''), cancellation_fee_amount = v_fee
  where id = v_b.id;
  delete from public.availability_blocks where booking_id = v_b.id;

  if v_actor = 'owner' and v_b.status = 'confirmed' then
    insert into public.owner_strikes (owner_id, property_id, booking_id, reason)
    values (v_uid, v_b.property_id, v_b.id, coalesce(nullif(trim(p_reason), ''), 'owner_cancelled_confirmed_booking'));
    select count(*) into v_strikes from public.owner_strikes where owner_id = v_uid and revoked_at is null;
    if v_strikes >= public.setting_int('strike_flag_threshold', 2) then
      update public.properties
      set flagged_for_review = true, flag_reason = 'strikes', flagged_at = now()
      where owner_id = v_uid and deleted_at is null;
    end if;
    insert into public.notifications (recipient_id, kind, payload)
    values (v_b.guest_id, 'booking_cancelled_by_owner', jsonb_build_object('booking_id', v_b.id, 'reference', v_b.reference)),
           (v_uid, 'strike_received', jsonb_build_object('booking_id', v_b.id, 'reference', v_b.reference, 'active_strikes', v_strikes));
  elsif v_actor = 'guest' then
    insert into public.notifications (recipient_id, kind, payload)
    values (v_b.prop_owner, 'booking_cancelled_by_guest', jsonb_build_object('booking_id', v_b.id, 'reference', v_b.reference));
  end if;
  return 'cancelled';
end;
$$;

-- What each side may see about the other. The owner's legal name and phone
-- are only ever revealed to the guest of a CONFIRMED booking.
create or replace function public.get_booking_contact(p_booking_id uuid)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_b record;
  v_owner record;
  v_guest record;
begin
  select b.id, b.status, b.guest_id, b.reference, p.owner_id as prop_owner, p.title as prop_title
  into v_b
  from public.bookings b join public.properties p on p.id = b.property_id
  where b.id = p_booking_id;
  if v_b.id is null then
    return null;
  end if;

  select full_name, legal_name, phone, verified, host_type into v_owner from public.profiles where id = v_b.prop_owner;
  select full_name, phone into v_guest from public.profiles where id = v_b.guest_id;

  if v_b.guest_id = v_uid then
    if v_b.status <> 'confirmed' then
      return jsonb_build_object('role', 'guest', 'status', v_b.status, 'reference', v_b.reference);
    end if;
    return jsonb_build_object(
      'role', 'guest', 'status', v_b.status, 'reference', v_b.reference,
      'property_title', v_b.prop_title,
      'owner_display_name', v_owner.full_name,
      'owner_legal_name', v_owner.legal_name,
      'owner_phone', v_owner.phone,
      'owner_verified', v_owner.verified,
      'owner_host_type', coalesce(v_owner.host_type, 'owner'),
      'guest_name', v_guest.full_name
    );
  elsif v_b.prop_owner = v_uid or public.is_admin() then
    return jsonb_build_object(
      'role', 'owner', 'status', v_b.status, 'reference', v_b.reference,
      'property_title', v_b.prop_title,
      'guest_name', v_guest.full_name,
      'guest_phone', case when v_b.status = 'confirmed' then v_guest.phone end
    );
  end if;
  return null;
end;
$$;

-- ===========================================================================
-- 10. Calendar freshness
-- ===========================================================================

create or replace function public.touch_calendar_updated()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.properties set calendar_updated_at = now()
  where id = coalesce(new.property_id, old.property_id);
  return null;
end;
$$;
create trigger touch_calendar_updated_trigger
  after insert or update or delete on public.availability_blocks
  for each row execute procedure public.touch_calendar_updated();

create or replace function public.mark_calendar_reviewed(p_property_id uuid)
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare
  v_now timestamptz := now();
begin
  update public.properties set calendar_updated_at = v_now
  where id = p_property_id and (owner_id = auth.uid() or public.is_admin());
  if not found then
    raise exception 'not_authorized';
  end if;
  return v_now;
end;
$$;

-- ===========================================================================
-- 11. Check-in condition checklist (owner + guest both confirm)
-- ===========================================================================

create table public.checkin_checklists (
  booking_id uuid primary key references public.bookings (id) on delete restrict,
  items jsonb not null default '[]'::jsonb,
  notes text,
  owner_confirmed_at timestamptz,
  guest_confirmed_at timestamptz,
  updated_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.checkin_checklists enable row level security;
create policy "Booking parties view the checklist"
  on public.checkin_checklists for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b join public.properties p on p.id = b.property_id
      where b.id = booking_id and (b.guest_id = auth.uid() or p.owner_id = auth.uid())
    )
  );

create or replace function public.booking_party(p_booking_id uuid)
returns text
language sql
stable
security definer set search_path = public
as $$
  select case
    when b.guest_id = auth.uid() then 'guest'
    when p.owner_id = auth.uid() then 'owner'
  end
  from public.bookings b join public.properties p on p.id = b.property_id
  where b.id = p_booking_id and b.status = 'confirmed';
$$;

create or replace function public.save_checkin_checklist(p_booking_id uuid, p_items jsonb, p_notes text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_party text := public.booking_party(p_booking_id);
  v_row public.checkin_checklists;
begin
  if v_party is null then
    raise exception 'not_authorized';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 40 then
    raise exception 'invalid_items';
  end if;
  select * into v_row from public.checkin_checklists where booking_id = p_booking_id for update;
  if v_row.booking_id is not null and v_row.owner_confirmed_at is not null and v_row.guest_confirmed_at is not null then
    raise exception 'checklist_locked';
  end if;
  insert into public.checkin_checklists (booking_id, items, notes, updated_by)
  values (p_booking_id, p_items, nullif(trim(p_notes), ''), auth.uid())
  on conflict (booking_id) do update
  set items = excluded.items, notes = excluded.notes, updated_by = excluded.updated_by, updated_at = now(),
      -- Any edit means both sides must confirm the new version.
      owner_confirmed_at = case when checkin_checklists.items is distinct from excluded.items
                                  or checkin_checklists.notes is distinct from excluded.notes
                                then null else checkin_checklists.owner_confirmed_at end,
      guest_confirmed_at = case when checkin_checklists.items is distinct from excluded.items
                                  or checkin_checklists.notes is distinct from excluded.notes
                                then null else checkin_checklists.guest_confirmed_at end;
end;
$$;

create or replace function public.confirm_checkin_checklist(p_booking_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_party text := public.booking_party(p_booking_id);
begin
  if v_party is null then
    raise exception 'not_authorized';
  end if;
  if v_party = 'owner' then
    update public.checkin_checklists set owner_confirmed_at = now() where booking_id = p_booking_id;
  else
    update public.checkin_checklists set guest_confirmed_at = now() where booking_id = p_booking_id;
  end if;
  if not found then
    raise exception 'checklist_empty';
  end if;
end;
$$;

-- ===========================================================================
-- 12. ID documents: private buckets, consent, access log, retention
-- ===========================================================================

-- Tighten the existing private bucket: type/size limits, and NO direct
-- reads at all — every read goes through authorize_document_access() (which
-- logs it) and a 60-second signed URL minted server-side.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
where id = 'verification-documents';
drop policy if exists "Users view their own verification documents" on storage.objects;
drop policy if exists "Admins view all verification documents" on storage.objects;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('guest-ids', 'guest-ids', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs', 'payment-proofs', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'])
on conflict (id) do update
set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Path: {guest_id}/{booking_id}/{random}.{ext}
create policy "Guests upload IDs for their own confirmed booking"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'guest-ids'
    and (storage.foldername(name))[1] = auth.uid()::text
    and exists (
      select 1 from public.bookings b
      where b.id::text = (storage.foldername(name))[2] and b.guest_id = auth.uid() and b.status = 'confirmed'
    )
  );

create policy "Owners upload their own payment proofs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-proofs' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.booking_guest_ids (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete restrict,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  guest_full_name text not null,
  storage_path text,
  consent_at timestamptz not null,
  consent_version text not null,
  purge_after timestamptz not null,
  purged_at timestamptz,
  created_at timestamptz not null default now()
);
create index booking_guest_ids_booking_idx on public.booking_guest_ids (booking_id);
create index booking_guest_ids_purge_idx on public.booking_guest_ids (purge_after) where purged_at is null;
alter table public.booking_guest_ids enable row level security;
create policy "Guests view metadata of IDs they uploaded"
  on public.booking_guest_ids for select using (auth.uid() = uploaded_by);
create policy "Owners view ID metadata for their confirmed bookings"
  on public.booking_guest_ids for select
  using (
    exists (
      select 1 from public.bookings b join public.properties p on p.id = b.property_id
      where b.id = booking_id and p.owner_id = auth.uid() and b.status = 'confirmed'
    )
  );
create policy "Admins view all ID metadata" on public.booking_guest_ids for select using (public.is_admin());

create or replace function public.register_guest_id(
  p_booking_id uuid,
  p_storage_path text,
  p_guest_full_name text,
  p_consent_version text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_b record;
  v_count integer;
  v_id uuid;
begin
  select id, guest_id, status, check_out, coalesce(adults_count, guests_count) as adults
  into v_b from public.bookings where id = p_booking_id;
  if v_b.id is null or v_b.guest_id <> v_uid then
    raise exception 'not_authorized';
  end if;
  if v_b.status <> 'confirmed' then
    raise exception 'booking_not_confirmed';
  end if;
  if coalesce(trim(p_consent_version), '') = '' then
    raise exception 'consent_required';
  end if;
  if coalesce(trim(p_guest_full_name), '') = '' then
    raise exception 'guest_name_required';
  end if;
  if split_part(p_storage_path, '/', 1) <> v_uid::text or split_part(p_storage_path, '/', 2) <> p_booking_id::text then
    raise exception 'invalid_document_path';
  end if;
  select count(*) into v_count from public.booking_guest_ids
  where booking_id = p_booking_id and purged_at is null and purge_after > now();
  if v_count >= v_b.adults then
    raise exception 'all_ids_uploaded';
  end if;

  insert into public.booking_guest_ids (booking_id, uploaded_by, guest_full_name, storage_path, consent_at, consent_version, purge_after)
  values (
    p_booking_id, v_uid, trim(p_guest_full_name), p_storage_path, now(), p_consent_version,
    ((v_b.check_out + public.setting_int('guest_id_retention_days', 30))::timestamp at time zone 'Africa/Cairo')
  )
  returning id into v_id;
  return v_id;
end;
$$;

-- Guest withdraws an ID (right to erasure): the file is purged on the next
-- maintenance run; the row stays as a record.
create or replace function public.withdraw_guest_id(p_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.booking_guest_ids set purge_after = now()
  where id = p_id and uploaded_by = auth.uid() and purged_at is null;
  if not found then
    raise exception 'not_authorized';
  end if;
end;
$$;

create table public.document_access_log (
  id bigint generated always as identity primary key,
  accessor_id uuid references public.profiles (id),
  accessor_role text not null,
  document_kind text not null,
  record_id uuid not null,
  bucket text not null,
  storage_path text not null,
  subject_profile_id uuid,
  booking_id uuid,
  accessed_at timestamptz not null default now()
);
create index document_access_log_accessed_idx on public.document_access_log (accessed_at desc);
alter table public.document_access_log enable row level security;
create policy "Admins view the document access log"
  on public.document_access_log for select using (public.is_admin());

-- Authorise + log in one step. The caller then gets a 60s signed URL from
-- the server route (which uses the service role — clients have no read
-- policy on these buckets at all).
create or replace function public.authorize_document_access(p_kind text, p_record_id uuid)
returns table (bucket text, storage_path text)
language plpgsql
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_admin boolean := public.is_admin();
  v_bucket text;
  v_path text;
  v_subject uuid;
  v_booking uuid;
  v_ok boolean := false;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  if p_kind in ('verification_id', 'verification_proof') then
    select case when p_kind = 'verification_id' then vr.id_document_url else vr.ownership_proof_path end, vr.profile_id
    into v_path, v_subject
    from public.verification_requests vr where vr.id = p_record_id;
    v_bucket := 'verification-documents';
    v_ok := v_admin;
  elsif p_kind = 'broker_authorization' then
    select ba.document_path, ba.broker_id into v_path, v_subject
    from public.broker_authorizations ba where ba.id = p_record_id;
    v_bucket := 'verification-documents';
    v_ok := v_admin;
  elsif p_kind = 'guest_id' then
    select g.storage_path, g.uploaded_by, g.booking_id, (p.owner_id = v_uid and b.status = 'confirmed')
    into v_path, v_subject, v_booking, v_ok
    from public.booking_guest_ids g
    join public.bookings b on b.id = g.booking_id
    join public.properties p on p.id = b.property_id
    where g.id = p_record_id and g.purged_at is null and g.purge_after > now();
    v_bucket := 'guest-ids';
    v_ok := coalesce(v_ok, false) or v_admin;
  elsif p_kind = 'payment_proof' then
    select sp.proof_path, sp.owner_id into v_path, v_subject
    from public.subscription_payments sp where sp.id = p_record_id;
    v_bucket := 'payment-proofs';
    v_ok := v_admin or v_subject = v_uid;
  else
    raise exception 'invalid_kind';
  end if;

  if v_path is null then
    raise exception 'document_not_found';
  end if;
  if not v_ok then
    raise exception 'not_authorized';
  end if;

  insert into public.document_access_log (accessor_id, accessor_role, document_kind, record_id, bucket, storage_path, subject_profile_id, booking_id)
  values (v_uid, case when v_admin then 'admin' when v_subject = v_uid then 'self' else 'owner' end,
          p_kind, p_record_id, v_bucket, v_path, v_subject, v_booking);

  return query select v_bucket, v_path;
end;
$$;

-- ===========================================================================
-- 13. Verification review (admin)
-- ===========================================================================

create or replace function public.review_verification(
  p_request_id uuid,
  p_approve boolean,
  p_legal_name text default null,
  p_reason text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_req record;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  select id, profile_id, kind, status into v_req from public.verification_requests where id = p_request_id for update;
  if v_req.id is null then
    raise exception 'request_not_found';
  end if;

  if p_approve then
    if coalesce(trim(p_legal_name), '') = '' then
      raise exception 'legal_name_required';
    end if;
    update public.verification_requests
    set status = 'approved', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = null
    where id = p_request_id;
    update public.profiles
    set verified = true, legal_name = trim(p_legal_name), host_type = v_req.kind,
        verification_revoked_at = null, verification_revoked_reason = null,
        role = case when role = 'guest' then 'owner'::public.user_role else role end
    where id = v_req.profile_id;
    insert into public.notifications (recipient_id, kind, payload)
    values (v_req.profile_id, 'verification_approved', jsonb_build_object('kind', v_req.kind));
  else
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'reason_required';
    end if;
    update public.verification_requests
    set status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(), rejection_reason = trim(p_reason)
    where id = p_request_id;
    insert into public.notifications (recipient_id, kind, payload)
    values (v_req.profile_id, 'verification_rejected', jsonb_build_object('reason', trim(p_reason)));
  end if;
end;
$$;

create or replace function public.revoke_verification(p_profile_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;
  update public.profiles
  set verified = false, verification_revoked_at = now(), verification_revoked_reason = trim(p_reason)
  where id = p_profile_id;
  insert into public.notifications (recipient_id, kind, payload)
  values (p_profile_id, 'verification_revoked', jsonb_build_object('reason', trim(p_reason)));
end;
$$;

create or replace function public.review_broker_authorization(p_id uuid, p_approve boolean, p_reason text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_broker uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if not p_approve and coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;
  update public.broker_authorizations
  set status = case when p_approve then 'approved' else 'rejected' end,
      rejection_reason = case when p_approve then null else trim(p_reason) end,
      reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_id
  returning broker_id into v_broker;
  if v_broker is null then
    raise exception 'not_found';
  end if;
  insert into public.notifications (recipient_id, kind, payload)
  values (v_broker, case when p_approve then 'authorization_approved' else 'authorization_rejected' end,
          jsonb_build_object('authorization_id', p_id, 'reason', p_reason));
end;
$$;

-- ===========================================================================
-- 14. Payments → subscriptions / featured
-- ===========================================================================

create or replace function public.submit_payment(
  p_kind text,
  p_plan text,
  p_property_ids uuid[],
  p_weeks integer,
  p_reference text,
  p_proof_path text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_count integer;
  v_amount integer := 0;
  v_breakdown jsonb;
  v_per_week integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if coalesce(trim(p_reference), '') = '' then
    raise exception 'missing_reference';
  end if;
  if p_proof_path is not null and split_part(p_proof_path, '/', 1) <> v_uid::text then
    raise exception 'invalid_document_path';
  end if;
  select count(*) into v_count from public.properties
  where id = any (p_property_ids) and owner_id = v_uid and deleted_at is null;
  if v_count = 0 or v_count <> coalesce(array_length(p_property_ids, 1), 0) then
    raise exception 'invalid_properties';
  end if;

  if p_kind = 'subscription' then
    if p_plan = 'student_winter' and exists (
      select 1 from public.properties where id = any (p_property_ids) and not monthly_rental_enabled
    ) then
      raise exception 'student_plan_requires_monthly_rental';
    end if;
    select coalesce(sum(q.amount), 0)::integer, jsonb_agg(to_jsonb(q))
    into v_amount, v_breakdown
    from public.quote_subscription(p_property_ids, p_plan) q;
  elsif p_kind = 'featured' then
    if p_weeks is null or p_weeks < 1 or p_weeks > 12 then
      raise exception 'invalid_weeks';
    end if;
    v_per_week := coalesce((select price_egp from public.subscription_prices where plan = 'featured_week' and tier = 'launch'), 300);
    v_amount := v_per_week * p_weeks * v_count;
    v_breakdown := jsonb_build_object('weeks', p_weeks, 'per_week', v_per_week, 'listings', v_count);
    p_plan := null;
  else
    raise exception 'invalid_kind';
  end if;

  insert into public.subscription_payments (
    owner_id, kind, plan, property_ids, featured_weeks, amount_egp, quoted_breakdown, instapay_reference, proof_path
  ) values (
    v_uid, p_kind, p_plan, p_property_ids, case when p_kind = 'featured' then p_weeks end,
    v_amount, v_breakdown, trim(p_reference), p_proof_path
  )
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.grant_featured_slot(p_property_id uuid, p_days integer, p_source text, p_payment_id uuid default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_compound uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_taken integer;
  v_id uuid;
begin
  select compound_id into v_compound from public.properties where id = p_property_id;
  select greatest(now(), coalesce(max(ends_at), now())) into v_start
  from public.featured_slots
  where property_id = p_property_id and cancelled_at is null and ends_at > now();
  v_end := v_start + make_interval(days => p_days);

  if v_compound is not null then
    select count(distinct fs.property_id) into v_taken
    from public.featured_slots fs
    where fs.compound_id = v_compound and fs.cancelled_at is null and fs.property_id <> p_property_id
      and fs.starts_at < v_end and fs.ends_at > v_start;
    if v_taken >= public.setting_int('featured_max_per_compound', 3) then
      raise exception 'featured_slots_full';
    end if;
  end if;

  insert into public.featured_slots (property_id, compound_id, starts_at, ends_at, source, payment_id)
  values (p_property_id, v_compound, v_start, v_end, p_source, p_payment_id)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_pay public.subscription_payments;
  v_q record;
  v_period record;
  v_pid uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  select * into v_pay from public.subscription_payments where id = p_payment_id for update;
  if v_pay.id is null or v_pay.status <> 'pending' then
    raise exception 'payment_not_pending';
  end if;

  if v_pay.kind = 'subscription' then
    for v_q in
      select * from jsonb_to_recordset(coalesce(v_pay.quoted_breakdown, '[]'::jsonb))
        as x(property_id uuid, tier text, list_price integer, discount_pct integer, amount integer,
             founder_rate boolean, included_free boolean)
    loop
      select * into v_period from public.plan_period(v_pay.plan, v_q.property_id);
      insert into public.listing_subscriptions (
        property_id, owner_id, plan, tier, price_egp, discount_pct, amount_egp,
        starts_at, ends_at, source, payment_id, is_founder_rate
      ) values (
        v_q.property_id, v_pay.owner_id, v_pay.plan, v_q.tier, v_q.list_price, v_q.discount_pct, v_q.amount,
        v_period.starts_at, v_period.ends_at, 'payment', v_pay.id, coalesce(v_q.founder_rate, false)
      );
    end loop;
  else
    foreach v_pid in array v_pay.property_ids loop
      perform public.grant_featured_slot(v_pid, v_pay.featured_weeks * 7, 'payment', v_pay.id);
    end loop;
  end if;

  update public.subscription_payments
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;
  insert into public.notifications (recipient_id, kind, payload)
  values (v_pay.owner_id, 'payment_approved', jsonb_build_object('payment_id', v_pay.id, 'amount', v_pay.amount_egp));
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;
  update public.subscription_payments
  set status = 'rejected', rejection_reason = trim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id and status = 'pending'
  returning owner_id into v_owner;
  if v_owner is null then
    raise exception 'payment_not_pending';
  end if;
  insert into public.notifications (recipient_id, kind, payload)
  values (v_owner, 'payment_rejected', jsonb_build_object('payment_id', p_payment_id, 'reason', trim(p_reason)));
end;
$$;

create or replace function public.claim_founder_featured(p_property_id uuid)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if not exists (
    select 1 from public.properties
    where id = p_property_id and owner_id = v_uid and status = 'published' and deleted_at is null
  ) then
    raise exception 'listing_not_published';
  end if;
  if not public.is_founding_host(v_uid) then
    raise exception 'not_founding_host';
  end if;
  if exists (
    select 1 from public.featured_slots fs join public.properties p on p.id = fs.property_id
    where fs.source = 'founder_free' and p.owner_id = v_uid
  ) then
    raise exception 'founder_featured_already_claimed';
  end if;
  return public.grant_featured_slot(p_property_id, public.setting_int('founder_featured_days', 30), 'founder_free');
end;
$$;

create or replace function public.admin_grant_featured(p_property_id uuid, p_days integer)
returns uuid
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  return public.grant_featured_slot(p_property_id, p_days, 'admin');
end;
$$;

-- Guarantee: a season plan with zero booking requests in its first 30 days
-- earns the next month free (one admin click).
create or replace function public.guarantee_status()
returns table (
  subscription_id uuid,
  property_id uuid,
  owner_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  window_ends_at timestamptz,
  requests_in_window integer,
  status text,
  granted_at timestamptz
)
language plpgsql
stable
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_admin boolean := public.is_admin();
  v_window interval := make_interval(days => public.setting_int('guarantee_window_days', 30));
begin
  return query
  select s.id, s.property_id, s.owner_id, s.starts_at, s.ends_at, s.starts_at + v_window,
         (select count(*)::integer from public.bookings b
          where b.property_id = s.property_id and b.created_at >= s.starts_at and b.created_at < s.starts_at + v_window),
         case
           when s.guarantee_extended_at is not null then 'granted'
           when now() < s.starts_at + v_window then 'tracking'
           when exists (select 1 from public.bookings b
                        where b.property_id = s.property_id and b.created_at >= s.starts_at and b.created_at < s.starts_at + v_window)
             then 'not_eligible'
           else 'eligible'
         end,
         s.guarantee_extended_at
  from public.listing_subscriptions s
  where s.plan = 'season' and s.status = 'active' and (v_admin or s.owner_id = auth.uid());
end;
$$;

create or replace function public.grant_guarantee_month(p_subscription_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_status text;
  v_owner uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  select g.status, g.owner_id into v_status, v_owner from public.guarantee_status() g where g.subscription_id = p_subscription_id;
  if v_status is distinct from 'eligible' then
    raise exception 'not_eligible';
  end if;
  update public.listing_subscriptions
  set ends_at = ends_at + interval '1 month', guarantee_extended_at = now()
  where id = p_subscription_id;
  insert into public.notifications (recipient_id, kind, payload)
  values (v_owner, 'guarantee_granted', jsonb_build_object('subscription_id', p_subscription_id));
end;
$$;

-- Old activation codes (incl. the always-valid "0000" bootstrap code that
-- let any owner self-activate) are retired in favour of InstaPay proofs.
create or replace function public.redeem_subscription_code(p_property_id uuid, p_code text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
begin
  raise exception 'subscription_codes_retired';
end;
$$;

-- ===========================================================================
-- 15. Analytics: tracking + reports
-- ===========================================================================

create or replace function public.track_listing_event(p_event text, p_property_id uuid default null, p_session_id text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_event not in ('view', 'whatsapp_click', 'site_visit') then
    raise exception 'invalid_event';
  end if;
  if p_session_id is not null and length(p_session_id) > 64 then
    raise exception 'invalid_session';
  end if;
  if p_property_id is not null then
    if not exists (select 1 from public.properties where id = p_property_id and status = 'published' and deleted_at is null) then
      return;
    end if;
    -- An owner looking at their own listing isn't a lead.
    if auth.uid() is not null and exists (select 1 from public.properties where id = p_property_id and owner_id = auth.uid()) then
      return;
    end if;
  end if;
  if p_session_id is not null and exists (
    select 1 from public.listing_events e
    where e.session_id = p_session_id and e.event = p_event
      and e.property_id is not distinct from p_property_id
      and e.created_at > now() - case when p_event = 'site_visit' then interval '12 hours' else interval '30 minutes' end
  ) then
    return;
  end if;
  insert into public.listing_events (property_id, event, session_id, user_id)
  values (p_property_id, p_event, p_session_id, auth.uid());
end;
$$;

create or replace function public.owner_listing_stats(p_from timestamptz, p_to timestamptz)
returns table (
  property_id uuid,
  views integer,
  whatsapp_clicks integer,
  booking_requests integer,
  confirmed_bookings integer,
  booking_value numeric
)
language sql
stable
security definer set search_path = public
as $$
  select p.id,
         count(distinct coalesce(e.session_id, e.id::text)) filter (where e.event = 'view')::integer,
         count(*) filter (where e.event = 'whatsapp_click')::integer,
         count(*) filter (where e.event = 'booking_request')::integer,
         count(*) filter (where e.event = 'booking_confirmed')::integer,
         coalesce(sum(e.value_egp) filter (where e.event = 'booking_confirmed'), 0)
  from public.properties p
  left join public.listing_events e
    on e.property_id = p.id and e.created_at >= p_from and e.created_at < p_to
  where p.owner_id = auth.uid() and p.deleted_at is null
  group by p.id;
$$;

create or replace function public.admin_weekly_kpis(p_weeks integer default 8, p_compound_id uuid default null)
returns table (
  week_start date,
  new_listings integer,
  verified_listings integer,
  site_visits integer,
  booking_requests integer,
  confirmed_bookings integer
)
language plpgsql
stable
security definer set search_path = public
as $$
#variable_conflict use_column
declare
  v_this_week date := date_trunc('week', now() at time zone 'Africa/Cairo')::date;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  return query
  with weeks as (
    select (v_this_week - (g * 7))::date as ws from generate_series(0, greatest(p_weeks, 1) - 1) g
  ), bounds as (
    select ws,
           (ws::timestamp at time zone 'Africa/Cairo') as from_ts,
           ((ws + 7)::timestamp at time zone 'Africa/Cairo') as to_ts
    from weeks
  )
  select b.ws,
    (select count(*)::integer from public.properties p
      where p.deleted_at is null and (p_compound_id is null or p.compound_id = p_compound_id)
        and p.created_at >= b.from_ts and p.created_at < b.to_ts),
    (select count(*)::integer from public.properties p
      where p.deleted_at is null and (p_compound_id is null or p.compound_id = p_compound_id)
        and p.first_published_at >= b.from_ts and p.first_published_at < b.to_ts),
    (select count(distinct coalesce(e.session_id, e.id::text))::integer from public.listing_events e
      where e.event = case when p_compound_id is null then 'site_visit' else 'view' end
        and (p_compound_id is null or e.compound_id = p_compound_id)
        and e.created_at >= b.from_ts and e.created_at < b.to_ts),
    (select count(*)::integer from public.listing_events e
      where e.event = 'booking_request' and (p_compound_id is null or e.compound_id = p_compound_id)
        and e.created_at >= b.from_ts and e.created_at < b.to_ts),
    (select count(*)::integer from public.listing_events e
      where e.event = 'booking_confirmed' and (p_compound_id is null or e.compound_id = p_compound_id)
        and e.created_at >= b.from_ts and e.created_at < b.to_ts)
  from bounds b
  order by b.ws;
end;
$$;

-- ===========================================================================
-- 16. Duplicate-listing detection
-- ===========================================================================

create table public.listing_duplicate_flags (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete restrict,
  other_property_id uuid not null references public.properties (id) on delete restrict,
  score numeric(5, 2) not null,
  reasons text[] not null,
  status text not null default 'open' check (status in ('open', 'dismissed', 'confirmed')),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (property_id, other_property_id)
);
alter table public.listing_duplicate_flags enable row level security;
create policy "Admins manage duplicate flags" on public.listing_duplicate_flags for all
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.detect_listing_duplicates(p_property_id uuid)
returns integer
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_p record;
  v_o record;
  v_reasons text[];
  v_score numeric;
  v_sim real;
  v_count integer := 0;
begin
  select id, compound_id, title, unit_address, bedrooms into v_p
  from public.properties where id = p_property_id and deleted_at is null;
  if v_p.id is null or v_p.compound_id is null then
    return 0;
  end if;

  for v_o in
    select id, title, unit_address, bedrooms from public.properties
    where compound_id = v_p.compound_id and id <> v_p.id and deleted_at is null
  loop
    v_reasons := '{}';
    v_score := 0;
    v_sim := similarity(lower(v_p.title), lower(v_o.title));
    if v_sim >= 0.6 then
      v_reasons := array_append(v_reasons, 'similar_title');
      v_score := v_score + v_sim;
    end if;
    if public.normalize_unit(v_p.unit_address) <> '' and public.normalize_unit(v_o.unit_address) <> ''
       and similarity(public.normalize_unit(v_p.unit_address), public.normalize_unit(v_o.unit_address)) >= 0.7 then
      v_reasons := array_append(v_reasons, 'similar_address');
      v_score := v_score + 1;
    end if;
    if exists (
      select 1 from public.property_images a
      join public.property_images b on a.content_hash = b.content_hash
      where a.property_id = v_p.id and b.property_id = v_o.id and a.content_hash is not null
    ) then
      v_reasons := array_append(v_reasons, 'shared_photos');
      v_score := v_score + 1.5;
    end if;

    if coalesce(array_length(v_reasons, 1), 0) > 0 then
      if v_p.bedrooms = v_o.bedrooms then
        v_score := v_score + 0.2;
      end if;
      insert into public.listing_duplicate_flags (property_id, other_property_id, score, reasons)
      values (least(v_p.id, v_o.id), greatest(v_p.id, v_o.id), round(v_score, 2), v_reasons)
      on conflict (property_id, other_property_id) do update
        set score = excluded.score, reasons = excluded.reasons, updated_at = now()
        where public.listing_duplicate_flags.status = 'open';
      v_count := v_count + 1;
    end if;
  end loop;
  return v_count;
end;
$$;

create or replace function public.on_property_identity_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.detect_listing_duplicates(new.id);
  return null;
end;
$$;
create trigger property_identity_change_trigger
  after insert or update of title, unit_address, compound_id on public.properties
  for each row execute procedure public.on_property_identity_change();

create or replace function public.on_property_image_hashed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.content_hash is not null then
    perform public.detect_listing_duplicates(new.property_id);
  end if;
  return null;
end;
$$;
create trigger property_image_hashed_trigger
  after insert on public.property_images
  for each row execute procedure public.on_property_image_hashed();

-- ===========================================================================
-- 17. Scheduled maintenance (called by the Vercel cron route / pg_cron)
-- ===========================================================================

create or replace function public.run_daily_maintenance()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_expired integer;
  v_hidden integer := 0;
  v_reminders integer := 0;
  v_free_notices integer := 0;
  v_pid uuid;
  v_blockers text[];
  v_sub record;
  v_free_until timestamptz := public.setting_ts('free_until', '2027-04-01T00:00:00+02:00');
  v_reminder_days integer := public.setting_int('expiry_reminder_days', 7);
begin
  v_expired := public.expire_stale_bookings();

  for v_pid in select id from public.properties where status = 'published' and deleted_at is null loop
    v_blockers := public.refresh_listing_visibility(v_pid);
    if coalesce(array_length(v_blockers, 1), 0) > 0 then
      v_hidden := v_hidden + 1;
    end if;
  end loop;

  -- 7 days before a plan runs out (and nothing newer follows it).
  for v_sub in
    select s.id, s.owner_id, s.property_id, s.plan, s.ends_at
    from public.listing_subscriptions s
    where s.status = 'active' and s.reminder_sent_at is null and s.plan <> 'student_winter'
      and s.ends_at > now() and s.ends_at <= now() + make_interval(days => v_reminder_days)
      and not exists (
        select 1 from public.listing_subscriptions s2
        where s2.property_id = s.property_id and s2.status = 'active' and s2.ends_at > s.ends_at
          and s2.plan <> 'student_winter'
      )
  loop
    insert into public.notifications (recipient_id, kind, payload)
    values (v_sub.owner_id, 'subscription_expiring', jsonb_build_object(
      'subscription_id', v_sub.id, 'property_id', v_sub.property_id, 'plan', v_sub.plan, 'ends_at', v_sub.ends_at));
    update public.listing_subscriptions set reminder_sent_at = now() where id = v_sub.id;
    v_reminders := v_reminders + 1;
  end loop;

  -- The free period ending is an "expiry" too.
  if now() >= v_free_until - make_interval(days => v_reminder_days) and now() < v_free_until then
    insert into public.notifications (recipient_id, kind, payload)
    select distinct p.owner_id, 'free_period_ending', jsonb_build_object('free_until', v_free_until)
    from public.properties p
    where p.status = 'published' and p.deleted_at is null
      and not exists (select 1 from public.listing_subscriptions s
                      where s.property_id = p.id and s.status = 'active' and s.ends_at > v_free_until)
      and not exists (select 1 from public.notifications n
                      where n.recipient_id = p.owner_id and n.kind = 'free_period_ending');
    get diagnostics v_free_notices = row_count;
  end if;

  return jsonb_build_object(
    'expired_bookings', v_expired, 'hidden_listings', v_hidden,
    'expiry_reminders', v_reminders, 'free_period_notices', v_free_notices);
end;
$$;

create or replace function public.enqueue_calendar_reminders()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.notifications (recipient_id, kind, payload)
  select p.owner_id, 'calendar_review',
         jsonb_build_object('listings', count(*), 'oldest_update', min(p.calendar_updated_at))
  from public.properties p
  where p.status = 'published' and p.deleted_at is null
  group by p.owner_id;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ===========================================================================
-- 18. Data cleanup
-- ===========================================================================

-- 18a. Unpublish obvious test listings.
insert into public.data_migration_log (migration, entity, entity_id, field, old_value, new_value)
select '0018', 'properties', id, 'status', status::text, 'draft'
from public.properties
where title in ('يمنبمنيستلهم', 'تاتا') and status <> 'draft';
insert into public.data_migration_log (migration, entity, entity_id, field, old_value, new_value)
select '0018', 'properties', id, 'unpublished_reason', unpublished_reason, 'test_listing'
from public.properties where title in ('يمنبمنيستلهم', 'تاتا');
update public.properties
set status = 'draft', unpublished_reason = 'test_listing'
where title in ('يمنبمنيستلهم', 'تاتا');

-- 18b. Merge the duplicate Arabic "مراسي" compound into "Marassi".
insert into public.data_migration_log (migration, entity, entity_id, field, old_value, new_value)
select '0018', 'properties', p.id, 'compound_id', p.compound_id::text, m.id::text
from public.properties p
join public.compounds dup on dup.id = p.compound_id
cross join (select id from public.compounds where slug = 'marassi' limit 1) m
where dup.name = 'مراسي' and dup.id <> m.id;

update public.properties p
set compound_id = m.id
from public.compounds dup, (select id from public.compounds where slug = 'marassi' limit 1) m
where p.compound_id = dup.id and dup.name = 'مراسي' and dup.id <> m.id;

insert into public.data_migration_log (migration, entity, entity_id, field, old_value, new_value)
select '0018', 'compounds', dup.id, 'merged_into', null, m.id::text
from public.compounds dup cross join (select id from public.compounds where slug = 'marassi' limit 1) m
where dup.name = 'مراسي' and dup.id <> m.id;

update public.compounds dup
set merged_into = m.id, hidden = true
from (select id from public.compounds where slug = 'marassi' limit 1) m
where dup.name = 'مراسي' and dup.id <> m.id;

-- 18c. Focus compounds (in priority order) + Arabic names.
insert into public.compounds (name, slug, area) values
  ('Porto Golf Marina', 'porto-golf-marina', 'El Alamein'),
  ('Aqua View', 'aqua-view', null) -- TODO(founder): confirm Aqua View's area + coordinates.
on conflict (slug) do nothing;

-- TODO(founder): "Stella" — several Stella projects exist on the coast
-- (e.g. Stella Di Mare, Stella Heights, Stella Sidi Abdel Rahman). No Stella
-- compound existed in the DB, so a generic "Stella" was added; confirm which
-- project it is and rename/relocate it from Admin → Compounds.
insert into public.compounds (name, slug, area)
select 'Stella', 'stella', null
where not exists (select 1 from public.compounds where name ilike '%stella%');

update public.compounds set is_focus = true, focus_rank = 1, name_ar = 'بورتو جولف مارينا' where slug = 'porto-golf-marina';
update public.compounds set is_focus = true, focus_rank = 2, name_ar = 'أمواج' where slug = 'amwaj';
update public.compounds set is_focus = true, focus_rank = 3, name_ar = 'أكوا فيو' where slug = 'aqua-view';
update public.compounds set is_focus = true, focus_rank = 4, name_ar = 'مارينا' where slug = 'marina';
update public.compounds set is_focus = true, focus_rank = 5, name_ar = coalesce(name_ar, 'ستيلا')
where id = (select id from public.compounds where name ilike '%stella%' order by created_at limit 1);
update public.compounds set name_ar = 'مراسي' where slug = 'marassi' and name_ar is null;

-- 18d. Apply the new publish rule to everything currently live (≥5 photos,
-- a price, a verified owner / approved broker). Logged for the down migration.
do $$
declare
  v_row record;
  v_blockers text[];
begin
  for v_row in select id, owner_id, price_per_night from public.properties where status = 'published' and deleted_at is null loop
    v_blockers := public.listing_blockers(v_row.id, v_row.owner_id, v_row.price_per_night);
    if coalesce(array_length(v_blockers, 1), 0) > 0 then
      insert into public.data_migration_log (migration, entity, entity_id, field, old_value, new_value)
      values ('0018', 'properties', v_row.id, 'status', 'published', 'draft');
      update public.properties
      set status = 'draft', unpublished_reason = array_to_string(v_blockers, ',')
      where id = v_row.id;
    end if;
  end loop;
end;
$$;

-- ===========================================================================
-- 19. Function privileges
-- ===========================================================================

-- Internal helpers: not callable from the browser.
revoke execute on function public.listing_blockers(uuid, uuid, numeric) from public, anon, authenticated;
revoke execute on function public.refresh_listing_visibility(uuid) from public, anon, authenticated;
revoke execute on function public.grant_featured_slot(uuid, integer, text, uuid) from public, anon, authenticated;
revoke execute on function public.detect_listing_duplicates(uuid) from public, anon, authenticated;
revoke execute on function public.run_daily_maintenance() from public, anon, authenticated;
revoke execute on function public.enqueue_calendar_reminders() from public, anon, authenticated;
revoke execute on function public.plan_period(text, uuid, timestamptz) from public, anon, authenticated;
revoke execute on function public.generate_booking_reference() from public, anon;

-- Anonymous visitors may only record analytics and read public badges.
revoke execute on function public.request_booking(uuid, date, date, integer, integer, text) from public, anon;
revoke execute on function public.respond_to_booking(uuid, text, text) from public, anon;
revoke execute on function public.cancel_booking(uuid, text) from public, anon;
revoke execute on function public.get_booking_contact(uuid) from public, anon;
revoke execute on function public.register_guest_id(uuid, text, text, text) from public, anon;
revoke execute on function public.withdraw_guest_id(uuid) from public, anon;
revoke execute on function public.authorize_document_access(text, uuid) from public, anon;
revoke execute on function public.submit_payment(text, text, uuid[], integer, text, text) from public, anon;
revoke execute on function public.quote_subscription(uuid[], text) from public, anon;
revoke execute on function public.save_checkin_checklist(uuid, jsonb, text) from public, anon;
revoke execute on function public.confirm_checkin_checklist(uuid) from public, anon;
revoke execute on function public.owner_listing_stats(timestamptz, timestamptz) from public, anon;

grant execute on function public.track_listing_event(text, uuid, text) to anon, authenticated;
grant execute on function public.host_badges(uuid[]) to anon, authenticated;
grant execute on function public.request_booking(uuid, date, date, integer, integer, text) to authenticated;
grant execute on function public.respond_to_booking(uuid, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid, text) to authenticated;
grant execute on function public.get_booking_contact(uuid) to authenticated;
grant execute on function public.register_guest_id(uuid, text, text, text) to authenticated;
grant execute on function public.withdraw_guest_id(uuid) to authenticated;
grant execute on function public.authorize_document_access(text, uuid) to authenticated;
grant execute on function public.submit_payment(text, text, uuid[], integer, text, text) to authenticated;
grant execute on function public.quote_subscription(uuid[], text) to authenticated;
grant execute on function public.save_checkin_checklist(uuid, jsonb, text) to authenticated;
grant execute on function public.confirm_checkin_checklist(uuid) to authenticated;
grant execute on function public.owner_listing_stats(timestamptz, timestamptz) to authenticated;
grant execute on function public.expire_stale_bookings() to authenticated;

-- ===========================================================================
-- 20. Optional: run booking expiry every 15 minutes inside Postgres too
--     (the Vercel cron is daily on the Hobby plan; pages also expire lazily).
-- ===========================================================================

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('safesahel-expire-bookings', '*/15 * * * *', 'select public.expire_stale_bookings()');
  end if;
exception when others then
  raise notice 'pg_cron not scheduled (%): booking expiry still runs via the cron route and on page loads.', sqlerrm;
end;
$$;
