-- Safe Sahel — fix booking creation being rejected for every date
--
-- availability_blocks has had RLS enabled since 0003, but the only INSERT/
-- UPDATE/DELETE policy ("Owners manage manual blocks...") is scoped to
-- reason = 'owner_blocked' — the manual "block these dates" feature. The
-- actual booking flow uses reason 'pending_hold' (guest requests) and
-- 'booked' (owner confirms), and NO policy ever covered those:
--   - A guest could never INSERT the 'pending_hold' row booking-form.tsx
--     creates on every booking request — RLS silently rejected it every
--     single time, regardless of whether the dates were actually free.
--     booking-form.tsx treats any insert error here as "someone else just
--     booked these dates", which is why that message appeared for every
--     date, not just genuinely unavailable ones.
--   - An owner could never UPDATE a hold to 'booked' on confirm, or DELETE
--     it on decline (owner-booking-actions.tsx) — both silently no-ops.

create policy "Guests create a pending hold for their own booking"
  on public.availability_blocks for insert
  with check (
    reason = 'pending_hold'
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.guest_id = auth.uid()
        and b.property_id = availability_blocks.property_id
    )
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

-- Same "no WITH CHECK on an UPDATE policy" gap hit three times already this
-- project (profiles.verified, properties.verified, bookings cancellation) —
-- this one didn't cause a visible bug yet (property_id doesn't change on
-- confirm/decline) but closes the hole before an owner could otherwise
-- reassign a booking row to a different property they own.
drop policy "Owners can update bookings on their own properties" on public.bookings;

create policy "Owners can update bookings on their own properties"
  on public.bookings for update
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));
