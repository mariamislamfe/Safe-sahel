-- 0021: Safe Sahel lists chalets, villas and studios only.
--
--   * adds 'studio' to the property_type enum;
--   * remaps existing rows: apartment → chalet, twin_house / town_house → villa
--     (Postgres can't drop enum values, so the old ones stay in the type);
--   * a check constraint blocks the old values from now on.
--
-- The constraint compares type::text, so it doesn't "use" the new enum value
-- inside the same transaction (safe to run the whole file at once).
-- Run after 0020. Reverse with down/0021_property_types.down.sql.

alter type public.property_type add value if not exists 'studio';

update public.properties set type = 'chalet' where type = 'apartment';
update public.properties set type = 'villa' where type in ('twin_house', 'town_house');

alter table public.properties drop constraint if exists properties_allowed_type;
alter table public.properties
  add constraint properties_allowed_type check (type::text in ('chalet', 'villa', 'studio'));

notify pgrst, 'reload schema';
