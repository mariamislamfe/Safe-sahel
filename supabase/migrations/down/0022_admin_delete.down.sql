-- Reverts 0022_admin_delete.sql (run before reverting 0021).
drop function if exists public.admin_delete_user(uuid);
drop function if exists public.admin_delete_property(uuid);
drop function if exists public.purge_user(uuid);
drop function if exists public.purge_property(uuid);
drop function if exists public.purge_bookings(uuid[]);

notify pgrst, 'reload schema';
