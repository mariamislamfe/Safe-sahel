-- Safe Sahel — profile extensions + identity verification (Phase 1.5)
--
-- Adds a public username, a user-level `verified` flag (distinct from
-- properties.verified), a verification request flow (guest/owner submits ID
-- + contact details, admin reviews and approves), and lets any authenticated
-- user register a new compound inline while listing a property.

alter table public.profiles add column username text unique;
alter table public.profiles add column verified boolean not null default false;

-- The existing "Profiles are editable by their owner" policy (0001) only
-- constrains `role` — it doesn't stop a user from also setting their own
-- `verified = true` in the same update, since RLS `with check` has no way
-- to say "this column must not change" on its own. A trigger closes that:
-- only an admin update is allowed to actually move `verified`.
create function public.prevent_self_verification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.verified := old.verified;
  end if;
  return new;
end;
$$;

create trigger prevent_self_verification_trigger
  before update on public.profiles
  for each row execute procedure public.prevent_self_verification();

-- Compounds stay a shared, community-maintained catalog rather than
-- admin-only — an owner listing a property should be able to add their
-- compound on the spot if it isn't there yet.
create policy "Authenticated users can add compounds"
  on public.compounds for insert
  to authenticated
  with check (true);

-- verification requests ----------------------------------------------------

create type public.verification_status as enum ('pending', 'contacted', 'approved', 'rejected');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  phone text not null,
  sahel_location text not null,
  id_document_url text not null,
  status public.verification_status not null default 'pending',
  admin_notes text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index verification_requests_profile_id_idx on public.verification_requests (profile_id);

alter table public.verification_requests enable row level security;

create policy "Users view their own verification requests"
  on public.verification_requests for select
  using (auth.uid() = profile_id);

create policy "Users can submit a verification request"
  on public.verification_requests for insert
  with check (auth.uid() = profile_id);

create policy "Admins view all verification requests"
  on public.verification_requests for select
  using (public.is_admin());

create policy "Admins update verification requests"
  on public.verification_requests for update
  using (public.is_admin())
  with check (public.is_admin());

-- Private storage bucket for ID documents ----------------------------------
-- NOT public, unlike property-images — this holds national ID photos.
-- Only the uploader and admins can ever read a given file.

insert into storage.buckets (id, name, public)
values ('verification-documents', 'verification-documents', false)
on conflict (id) do nothing;

create policy "Users upload their own verification documents"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users view their own verification documents"
  on storage.objects for select
  using (
    bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Admins view all verification documents"
  on storage.objects for select
  using (bucket_id = 'verification-documents' and public.is_admin());

-- Public avatars bucket -----------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "Users upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users replace their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
