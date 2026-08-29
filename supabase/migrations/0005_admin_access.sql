-- Safe Sahel — admin RLS bypass.
--
-- The admin panel needs to read/write rows it doesn't own (approve any
-- property, edit the compound/amenity catalog, view every user and
-- booking). The owner-scoped policies from earlier migrations don't cover
-- that, so this adds admin-only policies alongside them.

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create policy "Admins view all profiles"
  on public.profiles for select
  using (public.is_admin());

create policy "Admins manage all properties"
  on public.properties for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage compounds"
  on public.compounds for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins manage amenities"
  on public.amenities for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins view all bookings"
  on public.bookings for select
  using (public.is_admin());

create policy "Admins manage platform settings"
  on public.platform_settings for all
  using (public.is_admin())
  with check (public.is_admin());
