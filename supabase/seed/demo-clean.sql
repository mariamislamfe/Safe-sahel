-- ===========================================================================
-- Safe Sahel — remove ALL demo data (paste into the Supabase SQL Editor)
-- ===========================================================================
-- Deletes the demo accounts from demo.sql and everything they own or booked
-- (listings, photos rows, bookings, reviews, notifications...). Real users and
-- compounds are not touched. Requires migration 0022.
--
-- Also removes the old dev-seed demo owner (demo.owner@safesahel.dev, id
-- 1111…) and its sample listings from supabase/seed.sql, if present.
-- ===========================================================================

select public.purge_user(id)
from auth.users
where email like '%@demo.safesahel.test'
   or id = '11111111-1111-1111-1111-111111111111';
