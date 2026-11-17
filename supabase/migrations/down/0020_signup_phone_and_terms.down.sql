-- Reverts 0020_signup_phone_and_terms.sql (run before reverting 0019/0018).

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
revoke execute on function public.listing_blockers(uuid, uuid, numeric) from public, anon, authenticated;

drop function if exists public.normalize_phone(text);
alter table public.profiles drop column if exists terms_accepted_at;
alter table public.profiles drop column if exists terms_version;

notify pgrst, 'reload schema';
