-- 0020: mobile number at signup + terms acceptance record.
--
-- Booking coordination happens on WhatsApp, so:
--   * signup metadata `phone` is copied into profiles.phone (normalized,
--     invalid values dropped rather than failing the whole signup);
--   * a listing can't be published while its owner has no phone
--     (new blocker code `missing_phone`, shown as "why isn't it live?");
--   * which terms version a user accepted, and when, is kept on the profile.
--
-- Run after 0019. Reverse with down/0020_signup_phone_and_terms.down.sql.

alter table public.profiles add column if not exists terms_version text;
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- Same rules as packages/validation (isValidPhone/normalizePhone):
-- Egyptian mobiles → 01XXXXXXXXX, international → +digits, anything else → null.
create or replace function public.normalize_phone(p_raw text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v text := regexp_replace(coalesce(p_raw, ''), '[\s\-().]', '', 'g');
  m text[];
begin
  if v = '' then
    return null;
  end if;
  m := regexp_match(v, '^(?:\+?20|0020|0)?(1[0125][0-9]{8})$');
  if m is not null then
    return '0' || m[1];
  end if;
  if v ~ '^\+[0-9]{8,15}$' then
    return v;
  end if;
  return null;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  requested_role text := new.raw_user_meta_data ->> 'role';
  accepted_at timestamptz;
begin
  begin
    accepted_at := (new.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz;
  exception when others then
    accepted_at := null;
  end;

  insert into public.profiles (id, full_name, role, phone, terms_version, terms_accepted_at)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when requested_role in ('owner', 'guest') then requested_role::public.user_role else 'guest' end,
    public.normalize_phone(new.raw_user_meta_data ->> 'phone'),
    nullif(new.raw_user_meta_data ->> 'terms_version', ''),
    case when new.raw_user_meta_data ? 'terms_version' then coalesce(accepted_at, now()) end
  );
  return new;
end;
$$;

-- 0018's listing_blockers + `missing_phone`.
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
  v_phone text;
begin
  select count(*) into v_photos from public.property_images where property_id = p_property_id;
  if v_photos < public.setting_int('min_listing_photos', 5) then
    v_blockers := array_append(v_blockers, 'min_photos');
  end if;
  if p_price is null or p_price <= 0 then
    v_blockers := array_append(v_blockers, 'missing_price');
  end if;

  select verified, coalesce(host_type, 'owner'), nullif(trim(phone), '')
    into v_verified, v_host_type, v_phone
  from public.profiles where id = p_owner_id;

  if v_phone is null then
    v_blockers := array_append(v_blockers, 'missing_phone');
  end if;

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
grant execute on function public.normalize_phone(text) to authenticated;

-- Make the changes visible to the API immediately.
notify pgrst, 'reload schema';
