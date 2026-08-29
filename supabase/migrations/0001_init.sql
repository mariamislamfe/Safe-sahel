-- Safe Sahel — initial schema (Phase 0)
--
-- Deliberately minimal: just the identity foundation auth depends on.
-- Everything else in the proposed schema (properties, bookings, payments,
-- deposits, etc.) lands in Phase 1+ as those features get built.

create type public.user_role as enum ('guest', 'owner', 'admin');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'guest',
  full_name text,
  phone text,
  avatar_url text,
  locale text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

-- with check blocks self-promotion to admin — a guest can flip themselves
-- to 'owner' (the self-serve hosting path) but never to 'admin'.
create policy "Profiles are editable by their owner"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role in ('guest', 'owner'));

-- Auto-create a profile row whenever a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Keep updated_at current on every row change.
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();
