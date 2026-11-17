-- 0019_staff_roles.sql
-- Team roles for the admin dashboard.
--
-- The founder (profiles.role = 'admin') keeps full access. Anyone else can be
-- added to the team with a title and a set of section permissions; they only
-- see — and can only act on — those sections. Enforced in the database (RLS +
-- RPC checks), not just hidden in the UI.
--
-- Sections:
--   verification  owner/broker verification queue, verification documents
--   listings      listings, flags, duplicates, strikes, revoke badge
--   bookings      bookings + check-in/out handovers
--   payments      payments queue, subscriptions, guarantee, featured, payment proofs
--   reports       KPIs, targets, finance
--   users         user directory
--   catalog       compounds + amenities
--   security      ID document access log
-- Founder only: settings, prices, team management, guest ID documents.
--
-- Reversible: down/0019_staff_roles.down.sql.
-- Requires 0018.

-- ===========================================================================
-- 1. Team members + permission helpers
-- ===========================================================================

create table public.staff_members (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  title text not null,
  permissions text[] not null default '{}',
  active boolean not null default true,
  added_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deactivated_at timestamptz,
  constraint staff_members_known_permissions check (
    permissions <@ array['verification', 'listings', 'bookings', 'payments', 'reports', 'users', 'catalog', 'security']::text[]
  )
);
alter table public.staff_members enable row level security;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_admin()
    or exists (select 1 from public.staff_members where profile_id = auth.uid() and active);
$$;

create or replace function public.has_permission(p_permission text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1 from public.staff_members
      where profile_id = auth.uid() and active and p_permission = any (permissions)
    );
$$;

create policy "Founder manages the team"
  on public.staff_members for all using (public.is_admin()) with check (public.is_admin());
create policy "Team members see their own access"
  on public.staff_members for select using (profile_id = auth.uid());

-- ===========================================================================
-- 2. Read access per section (additive; founder policies stay as they are)
-- ===========================================================================

create policy "Team views profiles" on public.profiles for select using (public.is_staff());
create policy "Team views all properties" on public.properties for select using (public.is_staff());
create policy "Listings team views all photos" on public.property_images for select
  using (public.has_permission('listings'));

create policy "Verification team views requests" on public.verification_requests for select
  using (public.has_permission('verification'));
create policy "Verification team views broker authorizations" on public.broker_authorizations for select
  using (public.has_permission('verification'));

create policy "Listings team views duplicate flags" on public.listing_duplicate_flags for select
  using (public.has_permission('listings'));
create policy "Listings team views strikes" on public.owner_strikes for select
  using (public.has_permission('listings'));

create policy "Bookings team views bookings" on public.bookings for select
  using (public.has_permission('bookings'));
create policy "Bookings team manages handovers" on public.booking_handovers for all
  using (public.has_permission('bookings')) with check (public.has_permission('bookings'));
create policy "Bookings team manages handover photos" on public.booking_handover_photos for all
  using (public.has_permission('bookings')) with check (public.has_permission('bookings'));

create policy "Payments team views payments" on public.subscription_payments for select
  using (public.has_permission('payments') or public.has_permission('reports'));
create policy "Payments team views subscriptions" on public.listing_subscriptions for select
  using (public.has_permission('payments') or public.has_permission('reports'));
create policy "Payments team views featured slots" on public.featured_slots for select
  using (public.has_permission('payments'));

create policy "Reports team views listing events" on public.listing_events for select
  using (public.has_permission('reports'));

create policy "Catalog team manages compounds" on public.compounds for all
  using (public.has_permission('catalog')) with check (public.has_permission('catalog'));
create policy "Catalog team manages amenities" on public.amenities for all
  using (public.has_permission('catalog')) with check (public.has_permission('catalog'));

create policy "Security team views the access log" on public.document_access_log for select
  using (public.has_permission('security'));

-- ===========================================================================
-- 3. Admin actions that used direct table writes → RPCs with a permission check
-- ===========================================================================

-- p_action: unpublish | suspend | restore | clear_flag
create or replace function public.admin_moderate_listing(p_property_id uuid, p_action text, p_reason text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission('listings') then
    raise exception 'not_authorized';
  end if;
  if not exists (select 1 from public.properties where id = p_property_id) then
    raise exception 'listing_not_found';
  end if;
  if p_action = 'unpublish' then
    update public.properties
    set status = 'draft', unpublished_reason = coalesce(nullif(trim(p_reason), ''), 'admin')
    where id = p_property_id;
  elsif p_action = 'suspend' then
    if coalesce(trim(p_reason), '') = '' then
      raise exception 'reason_required';
    end if;
    update public.properties set status = 'suspended', unpublished_reason = trim(p_reason)
    where id = p_property_id;
  elsif p_action = 'restore' then
    update public.properties set status = 'draft', unpublished_reason = null
    where id = p_property_id and status = 'suspended';
  elsif p_action = 'clear_flag' then
    update public.properties set flagged_for_review = false, flag_reason = null, flagged_at = null
    where id = p_property_id;
  else
    raise exception 'invalid_action';
  end if;
end;
$$;

create or replace function public.admin_review_duplicate(p_flag_id uuid, p_status text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission('listings') then
    raise exception 'not_authorized';
  end if;
  if p_status not in ('dismissed', 'confirmed') then
    raise exception 'invalid_status';
  end if;
  update public.listing_duplicate_flags set status = p_status, reviewed_at = now(), reviewed_by = auth.uid(), updated_at = now() where id = p_flag_id;
end;
$$;

create or replace function public.admin_revoke_strike(p_strike_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission('listings') then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_reason), '') = '' then
    raise exception 'reason_required';
  end if;
  update public.owner_strikes
  set revoked_at = now(), revoked_by = auth.uid(), revoke_reason = trim(p_reason)
  where id = p_strike_id and revoked_at is null;
end;
$$;

create or replace function public.admin_cancel_featured(p_slot_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission('payments') then
    raise exception 'not_authorized';
  end if;
  update public.featured_slots set cancelled_at = now() where id = p_slot_id and cancelled_at is null;
end;
$$;

-- Hide a compound instead of deleting it (listings may still point at it).
create or replace function public.admin_set_compound_hidden(p_compound_id uuid, p_hidden boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.has_permission('catalog') then
    raise exception 'not_authorized';
  end if;
  update public.compounds set hidden = p_hidden where id = p_compound_id;
end;
$$;

-- What the signed-in user can see in the admin dashboard.
create or replace function public.my_admin_access()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select case
    when public.is_admin() then jsonb_build_object(
      'founder', true, 'title', null,
      'permissions', to_jsonb(array['verification', 'listings', 'bookings', 'payments', 'reports', 'users', 'catalog', 'security']))
    when s.profile_id is not null then jsonb_build_object(
      'founder', false, 'title', s.title, 'permissions', to_jsonb(s.permissions))
    else null
  end
  from (select 1) one
  left join public.staff_members s on s.profile_id = auth.uid() and s.active;
$$;

-- Founder adds (or updates) a team member by the email they signed up with.
create or replace function public.admin_upsert_staff(p_email text, p_title text, p_permissions text[])
returns uuid
language plpgsql
security definer set search_path = public, auth
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  if coalesce(trim(p_title), '') = '' then
    raise exception 'title_required';
  end if;
  if coalesce(array_length(p_permissions, 1), 0) = 0 then
    raise exception 'permissions_required';
  end if;
  select u.id into v_id from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'user_not_found';
  end if;
  if exists (select 1 from public.profiles where id = v_id and role = 'admin') then
    raise exception 'already_founder';
  end if;
  insert into public.staff_members (profile_id, title, permissions, active, added_by)
  values (v_id, trim(p_title), p_permissions, true, auth.uid())
  on conflict (profile_id) do update
  set title = excluded.title, permissions = excluded.permissions, active = true,
      deactivated_at = null, updated_at = now();
  return v_id;
end;
$$;

-- Removing someone only deactivates them (history stays).
create or replace function public.admin_set_staff_active(p_profile_id uuid, p_active boolean)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  update public.staff_members
  set active = p_active,
      deactivated_at = case when p_active then null else now() end,
      updated_at = now()
  where profile_id = p_profile_id;
end;
$$;

-- Team list with emails, for the founder's Team page.
create or replace function public.admin_list_staff()
returns table (
  profile_id uuid, email text, full_name text, title text, permissions text[],
  active boolean, created_at timestamptz, deactivated_at timestamptz
)
language plpgsql
stable
security definer set search_path = public, auth
as $$
begin
  if not public.is_admin() then
    raise exception 'not_authorized';
  end if;
  return query
  select s.profile_id, u.email::text, p.full_name, s.title, s.permissions, s.active, s.created_at, s.deactivated_at
  from public.staff_members s
  join public.profiles p on p.id = s.profile_id
  left join auth.users u on u.id = s.profile_id
  order by s.active desc, s.created_at;
end;
$$;

-- ===========================================================================
-- 4. Admin RPCs: section permission instead of founder-only
--    (bodies identical to 0018 apart from the permission check)
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
  if not public.has_permission('verification') then
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
  if not (public.has_permission('verification') or public.has_permission('listings')) then
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
  if not public.has_permission('verification') then
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
  if not public.has_permission('payments') then
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
  if not public.has_permission('payments') then
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
  if not public.has_permission('payments') then
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
  if not public.has_permission('payments') then
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
  if not public.has_permission('reports') then
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
  v_admin boolean := public.has_permission('payments');
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
  if v_owner is null or (v_owner <> auth.uid() and not public.has_permission('listings')) then
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
  v_verif boolean := public.has_permission('verification');
  v_pay boolean := public.has_permission('payments');
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
    v_ok := v_verif;
  elsif p_kind = 'broker_authorization' then
    select ba.document_path, ba.broker_id into v_path, v_subject
    from public.broker_authorizations ba where ba.id = p_record_id;
    v_bucket := 'verification-documents';
    v_ok := v_verif;
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
    v_ok := v_pay or v_subject = v_uid;
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
  values (v_uid, case when v_admin then 'admin' when v_subject = v_uid then 'self' when p_kind = 'guest_id' then 'owner' else 'staff' end,
          p_kind, p_record_id, v_bucket, v_path, v_subject, v_booking);

  return query select v_bucket, v_path;
end;
$$;

-- ===========================================================================
-- 5. Privileges
-- ===========================================================================

revoke execute on function public.admin_moderate_listing(uuid, text, text) from public, anon;
revoke execute on function public.admin_review_duplicate(uuid, text) from public, anon;
revoke execute on function public.admin_revoke_strike(uuid, text) from public, anon;
revoke execute on function public.admin_cancel_featured(uuid) from public, anon;
revoke execute on function public.admin_set_compound_hidden(uuid, boolean) from public, anon;
revoke execute on function public.my_admin_access() from public, anon;
revoke execute on function public.admin_upsert_staff(text, text, text[]) from public, anon;
revoke execute on function public.admin_set_staff_active(uuid, boolean) from public, anon;
revoke execute on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_moderate_listing(uuid, text, text) to authenticated;
grant execute on function public.admin_review_duplicate(uuid, text) to authenticated;
grant execute on function public.admin_revoke_strike(uuid, text) to authenticated;
grant execute on function public.admin_cancel_featured(uuid) to authenticated;
grant execute on function public.admin_set_compound_hidden(uuid, boolean) to authenticated;
grant execute on function public.my_admin_access() to authenticated;
grant execute on function public.admin_upsert_staff(text, text, text[]) to authenticated;
grant execute on function public.admin_set_staff_active(uuid, boolean) to authenticated;
grant execute on function public.admin_list_staff() to authenticated;

-- Make the new functions visible to the API immediately.
notify pgrst, 'reload schema';
