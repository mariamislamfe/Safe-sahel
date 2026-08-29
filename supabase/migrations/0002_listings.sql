-- Safe Sahel — listings schema (Phase 1)
--
-- Compounds, properties, their photos, the amenity catalog, and per-property
-- inventory. Booking/availability tables land separately once the booking
-- flow itself is built (Phase 2).

create type public.property_type as enum ('chalet', 'villa', 'apartment', 'twin_house', 'town_house');
create type public.property_status as enum ('draft', 'pending_review', 'published', 'suspended');
create type public.view_type as enum ('sea_view', 'lagoon_view', 'garden_view', 'street_view', 'no_view');

create table public.compounds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  area text,
  description text,
  cover_image_url text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.compounds enable row level security;

create policy "Compounds are viewable by everyone"
  on public.compounds for select
  using (true);

create trigger set_compounds_updated_at
  before update on public.compounds
  for each row execute procedure public.set_updated_at();

-- properties -----------------------------------------------------------

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  compound_id uuid references public.compounds (id) on delete set null,
  title text not null,
  slug text not null unique,
  type public.property_type not null,
  status public.property_status not null default 'draft',
  description text,
  bedrooms smallint not null default 1,
  bathrooms smallint not null default 1,
  max_guests smallint not null default 2,
  floor smallint,
  parking boolean not null default false,
  beach_access boolean not null default false,
  pool_access boolean not null default false,
  distance_to_beach_m integer,
  view_type public.view_type,
  price_per_night numeric(10, 2) not null,
  day_use_enabled boolean not null default false,
  day_use_price numeric(10, 2),
  min_stay_nights smallint not null default 1,
  verified boolean not null default false,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint day_use_price_requires_flag check (
    not day_use_enabled or day_use_price is not null
  )
);

create index properties_compound_id_idx on public.properties (compound_id);
create index properties_owner_id_idx on public.properties (owner_id);
create index properties_status_idx on public.properties (status) where deleted_at is null;

alter table public.properties enable row level security;

create policy "Published properties are viewable by everyone"
  on public.properties for select
  using (status = 'published' and deleted_at is null);

create policy "Owners can view their own properties"
  on public.properties for select
  using (auth.uid() = owner_id);

-- Only accounts with the owner/admin role can list a property — a guest
-- account can't insert one just by knowing the table shape.
create policy "Owners can insert their own properties"
  on public.properties for insert
  with check (
    auth.uid() = owner_id
    and exists (
      select 1 from public.profiles pr where pr.id = auth.uid() and pr.role in ('owner', 'admin')
    )
  );

create policy "Owners can update their own properties"
  on public.properties for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their own properties"
  on public.properties for delete
  using (auth.uid() = owner_id);

create trigger set_properties_updated_at
  before update on public.properties
  for each row execute procedure public.set_updated_at();

-- property_images --------------------------------------------------------

create table public.property_images (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  url text not null,
  sort_order smallint not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index property_images_property_id_idx on public.property_images (property_id);

alter table public.property_images enable row level security;

create policy "Property images are viewable wherever the property is"
  on public.property_images for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.owner_id = auth.uid() or (p.status = 'published' and p.deleted_at is null))
    )
  );

create policy "Owners manage their own property images"
  on public.property_images for all
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

-- amenities ---------------------------------------------------------------

create table public.amenities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  icon text,
  category text
);

alter table public.amenities enable row level security;

create policy "Amenities are viewable by everyone"
  on public.amenities for select
  using (true);

create table public.property_amenities (
  property_id uuid not null references public.properties (id) on delete cascade,
  amenity_id uuid not null references public.amenities (id) on delete cascade,
  primary key (property_id, amenity_id)
);

alter table public.property_amenities enable row level security;

create policy "Property amenities are viewable wherever the property is"
  on public.property_amenities for select
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id
        and (p.owner_id = auth.uid() or (p.status = 'published' and p.deleted_at is null))
    )
  );

create policy "Owners manage their own property amenities"
  on public.property_amenities for all
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

-- property inventory --------------------------------------------------------
-- Owner-only for now: guests interact with this during check-in/check-out
-- documentation (Phase 4), not while browsing, so no public select policy yet.

create table public.property_inventory_categories (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  sort_order smallint not null default 0
);

create index property_inventory_categories_property_id_idx on public.property_inventory_categories (property_id);

alter table public.property_inventory_categories enable row level security;

create policy "Owners manage their own inventory categories"
  on public.property_inventory_categories for all
  using (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.owner_id = auth.uid()));

create table public.property_inventory_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.property_inventory_categories (id) on delete cascade,
  name text not null,
  quantity smallint not null default 1,
  notes text
);

create index property_inventory_items_category_id_idx on public.property_inventory_items (category_id);

alter table public.property_inventory_items enable row level security;

create policy "Owners manage their own inventory items"
  on public.property_inventory_items for all
  using (
    exists (
      select 1 from public.property_inventory_categories c
      join public.properties p on p.id = c.property_id
      where c.id = category_id and p.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.property_inventory_categories c
      join public.properties p on p.id = c.property_id
      where c.id = category_id and p.owner_id = auth.uid()
    )
  );
