-- Safe Sahel — new booking statuses (must run BEFORE 0018).
--
-- Booking lifecycle is now: pending → confirmed / declined / expired / cancelled.
-- Postgres won't let a newly-added enum value be used in the same
-- transaction that adds it, so these live in their own migration file —
-- run this one, then 0018.
--
-- Reversal: enum values can't be dropped in Postgres. The 0018 down
-- migration maps 'pending' → 'pending_payment' and 'expired' → 'declined',
-- after which these two values are simply unused.

alter type public.booking_status add value if not exists 'pending';
alter type public.booking_status add value if not exists 'expired';
