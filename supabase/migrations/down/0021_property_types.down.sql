-- Reverts 0021_property_types.sql (run before reverting 0020).
-- The 'studio' enum value stays (Postgres can't drop enum values); studios
-- become chalets so nothing depends on it. The apartment/twin/town remap
-- isn't reversible — the original types weren't kept.

alter table public.properties drop constraint if exists properties_allowed_type;
update public.properties set type = 'chalet' where type::text = 'studio';

notify pgrst, 'reload schema';
