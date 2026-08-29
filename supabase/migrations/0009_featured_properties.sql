-- Safe Sahel — featured listings + closing an admin-only-field gap
--
-- Adds properties.featured (admin-settable, bubbles a listing to the top of
-- search — a paid placement lever for later). While adding it, also fixes a
-- gap that predates this migration: "Owners can update their own
-- properties" (0002) has no WITH CHECK, so an owner could already set their
-- own properties.verified = true directly via the Supabase client, same
-- class of bug as profiles.verified before 0006's trigger fixed that one.
-- properties.verified just never got the same treatment.

alter table public.properties add column featured boolean not null default false;

-- Covers insert too, not just update: without this an owner could set
-- verified/featured straight to true at creation time via a raw Supabase
-- client call — our own PropertyForm never does, but RLS shouldn't rely on
-- the UI behaving.
create function public.prevent_self_property_admin_fields()
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

create trigger prevent_self_property_admin_fields_trigger
  before insert or update on public.properties
  for each row execute procedure public.prevent_self_property_admin_fields();
