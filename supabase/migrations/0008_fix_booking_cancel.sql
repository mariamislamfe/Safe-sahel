-- Safe Sahel — fix guest booking cancellation
--
-- The "Guests can cancel their own pending bookings" policy from
-- 0003_booking_and_role_signup.sql only specified USING, no WITH CHECK.
-- Postgres RLS falls back to reusing USING as WITH CHECK for UPDATE
-- policies when none is given — which meant the *new* row also had to
-- satisfy status = 'pending_payment', so the update could never actually
-- move status to 'cancelled'. It silently updated zero rows. This is why a
-- stuck test booking couldn't be cancelled, permanently holding those dates
-- via its availability_blocks row.

drop policy "Guests can cancel their own pending bookings" on public.bookings;

create policy "Guests can cancel their own pending bookings"
  on public.bookings for update
  using (auth.uid() = guest_id and status = 'pending_payment')
  with check (auth.uid() = guest_id and status = 'cancelled');

-- Guests had no way to release the date hold tied to a booking they cancel
-- (only owners could delete blocks, via decline). A pending_hold block is
-- only ever created for the guest's own booking, so this is safe.
create policy "Guests remove the hold on their own pending booking"
  on public.availability_blocks for delete
  using (
    reason = 'pending_hold'
    and exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.guest_id = auth.uid()
    )
  );
