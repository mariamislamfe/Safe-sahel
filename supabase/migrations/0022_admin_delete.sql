-- 0022: permanent delete for listings and users (founder only).
--
-- Several tables reference listings/users with ON DELETE RESTRICT on purpose
-- (strikes, payments, ID records keep history), so a plain DELETE fails.
-- These functions remove the dependent rows in the right order:
--
--   purge_bookings(ids)      bookings + their strikes, guest-ID rows, checklists
--   purge_property(id)       a listing + its bookings, subscriptions, featured,
--                            analytics, duplicate flags, broker authorization
--   purge_user(id)           all their listings, their bookings as a guest,
--                            payments, strikes, team row; reviewer/actor
--                            columns on other records are set to null (the
--                            records stay); finally the auth user + profile.
--
-- purge_* are internal (service role / other definer functions only).
-- admin_delete_property / admin_delete_user are the founder-facing RPCs.
--
-- Note: files in Storage (photos, IDs, payment proofs) aren't removed here —
-- Supabase blocks deleting storage objects from SQL. They become orphans
-- and can be cleaned from the Storage dashboard.
--
-- Run after 0021. Reverse with down/0022_admin_delete.down.sql.

create or replace function public.purge_bookings(p_booking_ids uuid[])
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(array_length(p_booking_ids, 1), 0) = 0 then
    return;
  end if;
  delete from public.owner_strikes where booking_id = any (p_booking_ids);
  delete from public.booking_guest_ids where booking_id = any (p_booking_ids);
  delete from public.checkin_checklists where booking_id = any (p_booking_ids);
  -- availability blocks, reviews, guest reviews and handovers cascade.
  delete from public.bookings where id = any (p_booking_ids);
end;
$$;

create or replace function public.purge_property(p_property_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.purge_bookings(
    array(select id from public.bookings where property_id = p_property_id)
  );
  delete from public.owner_strikes where property_id = p_property_id;
  delete from public.listing_events where property_id = p_property_id;
  delete from public.listing_duplicate_flags
  where property_id = p_property_id or other_property_id = p_property_id;
  delete from public.featured_slots where property_id = p_property_id;
  delete from public.listing_subscriptions where property_id = p_property_id;
  delete from public.broker_authorizations where property_id = p_property_id;
  update public.subscription_codes set used_by_property_id = null
  where used_by_property_id = p_property_id;
  -- photos, amenities, inventory, calendar, favorites cascade; chats keep a null listing.
  delete from public.properties where id = p_property_id;
end;
$$;

create or replace function public.purge_user(p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_property uuid;
begin
  for v_property in select id from public.properties where owner_id = p_profile_id loop
    perform public.purge_property(v_property);
  end loop;

  perform public.purge_bookings(
    array(select id from public.bookings where guest_id = p_profile_id)
  );

  delete from public.owner_strikes where owner_id = p_profile_id;
  delete from public.listing_subscriptions where owner_id = p_profile_id;
  delete from public.featured_slots
  where payment_id in (select id from public.subscription_payments where owner_id = p_profile_id);
  update public.listing_subscriptions set payment_id = null
  where payment_id in (select id from public.subscription_payments where owner_id = p_profile_id);
  delete from public.subscription_payments where owner_id = p_profile_id;
  delete from public.broker_authorizations where broker_id = p_profile_id;
  delete from public.booking_guest_ids where uploaded_by = p_profile_id;
  delete from public.staff_members where profile_id = p_profile_id;

  -- Records this person reviewed or touched stay; only the pointer is cleared.
  update public.verification_requests set reviewed_by = null where reviewed_by = p_profile_id;
  update public.broker_authorizations set reviewed_by = null where reviewed_by = p_profile_id;
  update public.subscription_payments set reviewed_by = null where reviewed_by = p_profile_id;
  update public.booking_handovers set reviewed_by = null where reviewed_by = p_profile_id;
  update public.listing_duplicate_flags set reviewed_by = null where reviewed_by = p_profile_id;
  update public.owner_strikes set revoked_by = null where revoked_by = p_profile_id;
  update public.checkin_checklists set updated_by = null where updated_by = p_profile_id;
  update public.document_access_log set accessor_id = null where accessor_id = p_profile_id;
  update public.staff_members set added_by = null where added_by = p_profile_id;
  update public.subscription_codes set created_by = null where created_by = p_profile_id;

  -- Profile, favorites, notifications, reviews, verification requests cascade.
  delete from auth.users where id = p_profile_id;
  delete from public.profiles where id = p_profile_id;
end;
$$;

create or replace function public.admin_delete_property(p_property_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from public.properties where id = p_property_id) then
    raise exception 'listing_not_found';
  end if;
  perform public.purge_property(p_property_id);
end;
$$;

create or replace function public.admin_delete_user(p_profile_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if p_profile_id = auth.uid() then
    raise exception 'cannot_delete_self';
  end if;
  if exists (select 1 from public.profiles where id = p_profile_id and role = 'admin') then
    raise exception 'cannot_delete_founder';
  end if;
  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'user_not_found';
  end if;
  perform public.purge_user(p_profile_id);
end;
$$;

revoke execute on function public.purge_bookings(uuid[]) from public, anon, authenticated;
revoke execute on function public.purge_property(uuid) from public, anon, authenticated;
revoke execute on function public.purge_user(uuid) from public, anon, authenticated;
grant execute on function public.purge_bookings(uuid[]) to service_role;
grant execute on function public.purge_property(uuid) to service_role;
grant execute on function public.purge_user(uuid) to service_role;

revoke execute on function public.admin_delete_property(uuid) from public, anon;
revoke execute on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_property(uuid) to authenticated;
grant execute on function public.admin_delete_user(uuid) to authenticated;

notify pgrst, 'reload schema';
