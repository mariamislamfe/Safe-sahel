-- Safe Sahel — subscription gate + in-platform messaging (Phase 2)
--
-- A property can only be published once it has an active subscription.
-- Payment isn't wired up yet, so activation happens two ways for now:
--   1. A single bootstrap code "0000" — always valid, reusable, until real
--      admin-generated codes are the norm.
--   2. A real one-time code an admin generates (subscription_codes),
--      handed to an owner after they pay 500 EGP/month out of band (WhatsApp).
-- Both go through redeem_subscription_code() rather than direct table
-- access, so owners never get SELECT on subscription_codes (they'd be able
-- to browse and reuse codes meant for other people otherwise).

create type public.subscription_status as enum ('inactive', 'active');

alter table public.properties add column subscription_status public.subscription_status not null default 'inactive';
alter table public.properties add column subscription_current_period_end timestamptz;

-- Grandfather in anything already published (seed/demo data, or properties
-- published before this migration) so the new constraint below doesn't
-- retroactively break them.
update public.properties
set subscription_status = 'active', subscription_current_period_end = now() + interval '1 month'
where status = 'published';

alter table public.properties add constraint published_requires_active_subscription
  check (status <> 'published' or subscription_status = 'active');

create table public.subscription_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_by uuid references public.profiles (id),
  used_by_property_id uuid references public.properties (id),
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscription_codes enable row level security;

create policy "Admins manage subscription codes"
  on public.subscription_codes for all
  using (public.is_admin())
  with check (public.is_admin());

-- security definer: owners call this to redeem a code without ever getting
-- direct table access to subscription_codes.
create or replace function public.redeem_subscription_code(p_property_id uuid, p_code text)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_owner_id uuid;
  v_code_id uuid;
begin
  select owner_id into v_owner_id from public.properties where id = p_property_id;
  if v_owner_id is null or v_owner_id <> auth.uid() then
    raise exception 'Not authorized';
  end if;

  if p_code = '0000' then
    update public.properties
    set subscription_status = 'active', subscription_current_period_end = now() + interval '1 month'
    where id = p_property_id;
    return true;
  end if;

  select id into v_code_id from public.subscription_codes where code = p_code and used_at is null;
  if v_code_id is null then
    return false;
  end if;

  update public.subscription_codes
  set used_by_property_id = p_property_id, used_at = now()
  where id = v_code_id;

  update public.properties
  set subscription_status = 'active', subscription_current_period_end = now() + interval '1 month'
  where id = p_property_id;

  return true;
end;
$$;

grant execute on function public.redeem_subscription_code(uuid, text) to authenticated;

-- messaging ----------------------------------------------------------------
-- Keeps the owner's phone number off the guest's screen — everything routes
-- through the platform instead.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  guest_id uuid not null references public.profiles (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (property_id, guest_id, owner_id)
);

create index conversations_guest_id_idx on public.conversations (guest_id);
create index conversations_owner_id_idx on public.conversations (owner_id);

alter table public.conversations enable row level security;

create policy "Participants view their conversations"
  on public.conversations for select
  using (auth.uid() = guest_id or auth.uid() = owner_id);

create policy "Guests start a conversation with a host"
  on public.conversations for insert
  with check (auth.uid() = guest_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index messages_conversation_id_idx on public.messages (conversation_id);

alter table public.messages enable row level security;

create policy "Participants view messages in their conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create policy "Participants send messages in their conversations"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.guest_id = auth.uid() or c.owner_id = auth.uid())
    )
  );

create function public.touch_conversation_last_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

create trigger touch_conversation_last_message_trigger
  after insert on public.messages
  for each row execute procedure public.touch_conversation_last_message();

-- Broadcast new messages over Supabase Realtime so both sides see them live.
alter publication supabase_realtime add table public.messages;
