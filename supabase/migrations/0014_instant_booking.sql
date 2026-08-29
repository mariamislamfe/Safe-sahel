-- Safe Sahel — book instantly instead of waiting on owner approval
--
-- The exclusion constraint on availability_blocks already guarantees two
-- guests can never hold the same dates — there's no real reason to also
-- gate every booking behind a manual owner "confirm" step. booking-form.tsx
-- now inserts bookings as 'confirmed' (not 'pending_payment') and the
-- matching availability_block as 'booked' (not 'pending_hold') directly.
--
-- That breaks the guest-side policies from 0008/0012, which only ever
-- matched 'pending_payment' bookings and 'pending_hold' blocks — cancelling
-- a (now always 'confirmed') booking hit "new row violates row-level
-- security policy for table bookings" because no policy covered it.

drop policy if exists "Guests can cancel their own pending bookings" on public.bookings;
drop policy if exists "Guests can cancel their own booking" on public.bookings;

create policy "Guests can cancel their own booking"
  on public.bookings for update
  using (auth.uid() = guest_id and status in ('pending_payment', 'confirmed'))
  with check (auth.uid() = guest_id and status = 'cancelled');

drop policy if exists "Guests remove the hold on their own pending booking" on public.availability_blocks;
drop policy if exists "Guests remove the hold on their own booking" on public.availability_blocks;

create policy "Guests remove the hold on their own booking"
  on public.availability_blocks for delete
  using (
    reason in ('pending_hold', 'booked')
    and exists (select 1 from public.bookings b where b.id = booking_id and b.guest_id = auth.uid())
  );

drop policy if exists "Guests create a pending hold for their own booking" on public.availability_blocks;
drop policy if exists "Guests create the hold for their own booking" on public.availability_blocks;

create policy "Guests create the hold for their own booking"
  on public.availability_blocks for insert
  with check (
    reason in ('pending_hold', 'booked')
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id
        and b.guest_id = auth.uid()
        and b.property_id = availability_blocks.property_id
    )
  );
