-- Reverses 0018_business_alignment.sql (and makes 0017's enum values unused).
-- Run in the Supabase SQL editor. New tables are dropped — export them first
-- if you want to keep payments/subscriptions/analytics recorded since 0018.

-- 1. Put migrated data back -------------------------------------------------

update public.properties p
set compound_id = l.old_value::uuid
from public.data_migration_log l
where l.migration = '0018' and l.entity = 'properties' and l.field = 'compound_id' and l.entity_id = p.id;

update public.compounds c
set merged_into = null, hidden = false
from public.data_migration_log l
where l.migration = '0018' and l.entity = 'compounds' and l.field = 'merged_into' and l.entity_id = c.id;

-- Drop the publish gate before restoring 'published' rows.
drop trigger if exists zz_enforce_listing_publishable on public.properties;

update public.properties p
set status = l.old_value::public.property_status
from public.data_migration_log l
where l.migration = '0018' and l.entity = 'properties' and l.field = 'status' and l.entity_id = p.id;

update public.bookings b
set status = 'pending_payment'
from public.data_migration_log l
where l.migration = '0018' and l.entity = 'bookings' and l.field = 'status' and l.entity_id = b.id;

update public.bookings set status = 'pending_payment' where status = 'pending';
update public.bookings set status = 'declined' where status = 'expired';
alter table public.bookings alter column status set default 'pending_payment';

-- Recreate date holds for pending requests (best effort; skips conflicts).
do $$
declare
  v_b record;
begin
  for v_b in select id, property_id, check_in, check_out from public.bookings where status = 'pending_payment' loop
    begin
      insert into public.availability_blocks (property_id, range, reason, booking_id)
      values (v_b.property_id, daterange(v_b.check_in, v_b.check_out, '[)'), 'pending_hold', v_b.id);
    exception when exclusion_violation then
      null;
    end;
  end loop;
end;
$$;

-- 2. Triggers ---------------------------------------------------------------

drop trigger if exists zz_stamp_host_since on public.profiles;
drop trigger if exists profile_verification_change_trigger on public.profiles;
drop trigger if exists property_image_removed_trigger on public.property_images;
drop trigger if exists property_image_hashed_trigger on public.property_images;
drop trigger if exists property_identity_change_trigger on public.properties;
drop trigger if exists touch_calendar_updated_trigger on public.availability_blocks;
drop trigger if exists guard_verification_request_trigger on public.verification_requests;

do $$
begin
  perform cron.unschedule('safesahel-expire-bookings');
exception when others then
  null;
end;
$$;

-- 3. Functions ----------------------------------------------------------------

drop function if exists public.run_daily_maintenance();
drop function if exists public.enqueue_calendar_reminders();
drop function if exists public.on_property_image_hashed();
drop function if exists public.on_property_identity_change();
drop function if exists public.detect_listing_duplicates(uuid);
drop function if exists public.admin_weekly_kpis(integer, uuid);
drop function if exists public.owner_listing_stats(timestamptz, timestamptz);
drop function if exists public.track_listing_event(text, uuid, text);
drop function if exists public.grant_guarantee_month(uuid);
drop function if exists public.guarantee_status();
drop function if exists public.admin_grant_featured(uuid, integer);
drop function if exists public.claim_founder_featured(uuid);
drop function if exists public.reject_payment(uuid, text);
drop function if exists public.approve_payment(uuid);
drop function if exists public.grant_featured_slot(uuid, integer, text, uuid);
drop function if exists public.submit_payment(text, text, uuid[], integer, text, text);
drop function if exists public.review_broker_authorization(uuid, boolean, text);
drop function if exists public.revoke_verification(uuid, text);
drop function if exists public.review_verification(uuid, boolean, text, text);
drop function if exists public.authorize_document_access(text, uuid);
drop function if exists public.withdraw_guest_id(uuid);
drop function if exists public.register_guest_id(uuid, text, text, text);
drop function if exists public.confirm_checkin_checklist(uuid);
drop function if exists public.save_checkin_checklist(uuid, jsonb, text);
drop function if exists public.booking_party(uuid);
drop function if exists public.mark_calendar_reviewed(uuid);
drop function if exists public.touch_calendar_updated();
drop function if exists public.get_booking_contact(uuid);
drop function if exists public.cancel_booking(uuid, text);
drop function if exists public.respond_to_booking(uuid, text, text);
drop function if exists public.request_booking(uuid, date, date, integer, integer, text);
drop function if exists public.expire_stale_bookings();
drop function if exists public.set_listing_event_compound() cascade;
drop function if exists public.on_broker_authorization_change() cascade;
drop function if exists public.on_profile_verification_change();
drop function if exists public.on_property_image_removed();
drop function if exists public.refresh_listing_visibility(uuid);
drop function if exists public.enforce_listing_publishable();
drop function if exists public.property_publish_blockers(uuid);
drop function if exists public.listing_blockers(uuid, uuid, numeric);
drop function if exists public.plan_period(text, uuid, timestamptz);
drop function if exists public.quote_subscription(uuid[], text);
drop function if exists public.broker_discount_pct(uuid);
drop function if exists public.pricing_tier_for(uuid, numeric, timestamptz);
drop function if exists public.property_has_coverage(uuid, timestamptz);
drop function if exists public.guard_broker_authorization() cascade;
drop function if exists public.guard_verification_request();
drop function if exists public.host_badges(uuid[]);
drop function if exists public.is_founding_host(uuid);
drop function if exists public.stamp_host_since();

-- 4. Tables -------------------------------------------------------------------

drop table if exists public.listing_duplicate_flags;
drop table if exists public.document_access_log;
drop table if exists public.booking_guest_ids;
drop table if exists public.checkin_checklists;
drop table if exists public.listing_events;
drop table if exists public.owner_strikes;
drop table if exists public.notifications;
drop table if exists public.featured_slots;
drop table if exists public.listing_subscriptions;
drop table if exists public.subscription_payments;
drop table if exists public.broker_authorizations;
drop table if exists public.subscription_prices;

-- 5. Columns ------------------------------------------------------------------

alter table public.bookings drop constraint if exists bookings_reference_key;
alter table public.bookings drop column if exists reference;
alter table public.bookings drop column if exists adults_count;
alter table public.bookings drop column if exists expires_at;
alter table public.bookings drop column if exists confirmed_at;
alter table public.bookings drop column if exists declined_at;
alter table public.bookings drop column if exists expired_at;
alter table public.bookings drop column if exists decline_reason;
alter table public.bookings drop column if exists cancelled_by;
alter table public.bookings drop column if exists cancellation_reason;
drop function if exists public.generate_booking_reference();

alter table public.verification_requests drop column if exists kind;
alter table public.verification_requests drop column if exists ownership_proof_path;
alter table public.verification_requests drop column if exists ownership_proof_type;
alter table public.verification_requests drop column if exists rejection_reason;
alter table public.verification_requests drop column if exists consent_at;
alter table public.verification_requests drop column if exists consent_version;
alter table public.verification_requests drop column if exists reviewed_by;

drop index if exists public.properties_unique_unit_per_compound;
drop index if exists public.property_images_content_hash_idx;
alter table public.property_images drop column if exists content_hash;
alter table public.properties drop constraint if exists monthly_price_requires_flag;
alter table public.properties drop column if exists unit_address;
alter table public.properties drop column if exists monthly_rental_enabled;
alter table public.properties drop column if exists monthly_price;
alter table public.properties drop column if exists unpublished_reason;
alter table public.properties drop column if exists first_published_at;
alter table public.properties drop column if exists calendar_updated_at;
alter table public.properties drop column if exists flagged_for_review;
alter table public.properties drop column if exists flag_reason;
alter table public.properties drop column if exists flagged_at;

alter table public.compounds drop column if exists merged_into;
alter table public.compounds drop column if exists hidden;
alter table public.compounds drop column if exists focus_rank;
alter table public.compounds drop column if exists is_focus;
alter table public.compounds drop column if exists name_ar;

-- 6. Restore replaced functions -------------------------------------------------

create or replace function public.prevent_self_verification()
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

alter table public.profiles drop column if exists legal_name;
alter table public.profiles drop column if exists host_type;
alter table public.profiles drop column if exists host_since;
alter table public.profiles drop column if exists verification_revoked_at;
alter table public.profiles drop column if exists verification_revoked_reason;

create or replace function public.prevent_self_property_admin_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verified := false;
      new.featured := false;
    else
      new.verified := old.verified;
      new.featured := old.featured;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.redeem_subscription_code(p_property_id uuid, p_code text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_code_id uuid;
begin
  select owner_id into v_owner_id from public.properties where id = p_property_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if p_code = '0000' then
    update public.properties
    set subscription_status = 'active', subscription_current_period_end = now() + interval '1 month'
    where id = p_property_id;
    return true;
  end if;

  select id into v_code_id from public.subscription_codes where code = p_code and used_at is null;
  if v_code_id is null then
    return false;
  end if;

  update public.subscription_codes
  set used_by_property_id = p_property_id, used_at = now()
  where id = v_code_id;

  update public.properties
  set subscription_status = 'active', subscription_current_period_end = now() + interval '1 month'
  where id = p_property_id;

  return true;
end;
$$;

drop function if exists public.normalize_unit(text);
drop function if exists public.is_trusted_writer();
drop function if exists public.setting_ts(text, timestamptz);
drop function if exists public.setting_int(text, integer);
drop function if exists public.setting(text);

-- NOT VALID: rows published while 0018 was live may lack an active
-- subscription; the constraint applies to new writes only.
alter table public.properties add constraint published_requires_active_subscription
  check (status <> 'published' or subscription_status = 'active') not valid;

-- 7. Restore policies ---------------------------------------------------------

create policy "Owners can delete their own properties"
  on public.properties for delete using (auth.uid() = owner_id);

create policy "Guests can request a booking"
  on public.bookings for insert with check (auth.uid() = guest_id);
create policy "Guests can cancel their own booking"
  on public.bookings for update
  using (auth.uid() = guest_id and status in ('pending_payment', 'confirmed'))
  with check (auth.uid() = guest_id and status = 'cancelled');
create policy "Owners can update bookings on their own properties"
  on public.bookings for update
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create policy "Guests create the hold for their own booking"
  on public.availability_blocks for insert
  with check (
    reason in ('pending_hold', 'booked')
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.guest_id = auth.uid() and b.property_id = availability_blocks.property_id
    )
  );
create policy "Guests remove the hold on their own booking"
  on public.availability_blocks for delete
  using (
    reason in ('pending_hold', 'booked')
    and exists (select 1 from public.bookings b where b.id = booking_id and b.guest_id = auth.uid())
  );
create policy "Owners confirm or release holds tied to bookings on their properties"
  on public.availability_blocks for update
  using (
    reason in ('pending_hold', 'booked')
    and exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  )
  with check (
    reason in ('pending_hold', 'booked')
    and exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );
create policy "Owners delete holds tied to bookings on their properties"
  on public.availability_blocks for delete
  using (
    reason in ('pending_hold', 'booked')
    and exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid())
  );

drop policy if exists "Guests upload IDs for their own confirmed booking" on storage.objects;
drop policy if exists "Owners upload their own payment proofs" on storage.objects;
create policy "Users view their own verification documents"
  on storage.objects for select
  using (bucket_id = 'verification-documents' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Admins view all verification documents"
  on storage.objects for select
  using (bucket_id = 'verification-documents' and public.is_admin());

-- Buckets 'guest-ids' and 'payment-proofs' are left in place (empty them
-- from the Storage dashboard first if you want to remove them).

drop table if exists public.data_migration_log;
