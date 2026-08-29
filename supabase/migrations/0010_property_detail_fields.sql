-- Safe Sahel — richer property detail fields
--
-- Adds size/beds, check-in and village/beach-access text, house rules, and
-- a cancellation policy — all shown on the redesigned property detail page.

alter table public.properties add column size_sqm integer;
alter table public.properties add column beds smallint;
alter table public.properties add column check_in_instructions text;
alter table public.properties add column village_entry_requirements text;
alter table public.properties add column beach_access_details text;
alter table public.properties add column pets_allowed boolean not null default false;
alter table public.properties add column parties_allowed boolean not null default false;
alter table public.properties add column smoking_allowed boolean not null default false;
alter table public.properties add column commercial_photography_allowed boolean not null default false;

create type public.cancellation_policy as enum ('flexible', 'moderate', 'strict');
alter table public.properties add column cancellation_policy public.cancellation_policy not null default 'moderate';
