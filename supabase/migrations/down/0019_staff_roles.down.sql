-- Reverts 0019_staff_roles.sql. Team members lose dashboard access; the
-- founder keeps everything. Export public.staff_members first if you want
-- to keep the list.

drop function if exists public.admin_moderate_listing(uuid, text, text);
drop function if exists public.admin_review_duplicate(uuid, text);
drop function if exists public.admin_revoke_strike(uuid, text);
drop function if exists public.admin_cancel_featured(uuid);
drop function if exists public.admin_set_compound_hidden(uuid, boolean);
drop function if exists public.my_admin_access();
drop function if exists public.admin_upsert_staff(text, text, text[]);
drop function if exists public.admin_set_staff_active(uuid, boolean);
drop function if exists public.admin_list_staff();

drop policy if exists "Team views profiles" on public.profiles;
drop policy if exists "Team views all properties" on public.properties;
drop policy if exists "Listings team views all photos" on public.property_images;
drop policy if exists "Verification team views requests" on public.verification_requests;
drop policy if exists "Verification team views broker authorizations" on public.broker_authorizations;
drop policy if exists "Listings team views duplicate flags" on public.listing_duplicate_flags;
drop policy if exists "Listings team views strikes" on public.owner_strikes;
drop policy if exists "Bookings team views bookings" on public.bookings;
drop policy if exists "Bookings team manages handovers" on public.booking_handovers;
drop policy if exists "Bookings team manages handover photos" on public.booking_handover_photos;
drop policy if exists "Payments team views payments" on public.subscription_payments;
drop policy if exists "Payments team views subscriptions" on public.listing_subscriptions;
drop policy if exists "Payments team views featured slots" on public.featured_slots;
drop policy if exists "Reports team views listing events" on public.listing_events;
drop policy if exists "Catalog team manages compounds" on public.compounds;
drop policy if exists "Catalog team manages amenities" on public.amenities;
drop policy if exists "Security team views the access log" on public.document_access_log;
drop policy if exists "Founder manages the team" on public.staff_members;
drop policy if exists "Team members see their own access" on public.staff_members;

-- Restore the 0018 (founder-only) bodies.

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

-- Finally drop the helpers (nothing references them any more).
drop function if exists public.has_permission(text);
drop function if exists public.is_staff();
drop table if exists public.staff_members;
