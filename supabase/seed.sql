-- Local/dev seed data.

-- Coordinates are approximate (regional, not surveyed per-compound) — good
-- enough to place a pin on a map; correct them with precise data later.
-- cover_image_url is curated stock photography (verified real Unsplash
-- URLs) for the demo, standing in until each compound has its own photo.
insert into public.compounds (name, slug, area, latitude, longitude, cover_image_url) values
  ('Marassi', 'marassi', 'Sidi Abdel Rahman', 30.8203, 28.6689, 'https://images.unsplash.com/photo-1608538810980-d29299cfbd6b?auto=format&fit=crop&w=800&q=80'),
  ('Amwaj', 'amwaj', 'Sidi Heneish', 31.0500, 27.6167, 'https://images.unsplash.com/photo-1687516731248-be37fd6761ac?auto=format&fit=crop&w=800&q=80'),
  ('Hacienda Bay', 'hacienda-bay', 'Sidi Abdel Rahman', 30.8167, 28.6500, 'https://images.unsplash.com/photo-1655042490853-bbcbb76dedef?auto=format&fit=crop&w=800&q=80'),
  ('Seashell', 'seashell', 'Sidi Heneish', 31.0450, 27.6300, 'https://images.unsplash.com/photo-1627023851505-2f44e73b30eb?auto=format&fit=crop&w=800&q=80'),
  ('Almaza Bay', 'almaza-bay', 'Ras El Hekma', 31.1667, 27.9333, 'https://images.unsplash.com/photo-1749036856868-d8f81ed0a028?auto=format&fit=crop&w=800&q=80'),
  ('Telal', 'telal', 'Sidi Heneish', 31.0400, 27.6100, 'https://images.unsplash.com/photo-1758538025972-8f53032e33f4?auto=format&fit=crop&w=800&q=80'),
  ('Fouka Bay', 'fouka-bay', 'Fouka', 30.9000, 28.7833, 'https://images.unsplash.com/photo-1758538005259-9b29292204ee?auto=format&fit=crop&w=800&q=80'),
  ('Ghazala', 'ghazala', 'Sidi Abdel Rahman', 30.8300, 28.6800, 'https://images.unsplash.com/photo-1770504684414-cbb9b3c91c95?auto=format&fit=crop&w=800&q=80'),
  ('Caesar', 'caesar', 'Sidi Heneish', 31.0480, 27.6250, 'https://images.unsplash.com/photo-1770503775099-9f980bb47ace?auto=format&fit=crop&w=800&q=80'),
  ('Marina', 'marina', 'El Alamein', 30.8500, 28.5500, 'https://images.unsplash.com/photo-1416331108676-a22ccb276e35?auto=format&fit=crop&w=800&q=80'),
  ('La Vista Bay', 'la-vista-bay', 'Ras El Hekma', 31.1500, 27.9500, 'https://images.unsplash.com/photo-1707075108813-edefd7b3308d?auto=format&fit=crop&w=800&q=80'),
  ('Mountain View', 'mountain-view', 'Ras El Hekma', 31.0500, 27.7000, 'https://images.unsplash.com/photo-1765999906700-2d4dfd392966?auto=format&fit=crop&w=800&q=80'),
  ('Jefaira', 'jefaira', 'Ras El Hekma', 31.1700, 27.9200, 'https://images.unsplash.com/photo-1690832307571-d78b5d346651?auto=format&fit=crop&w=800&q=80'),
  ('White Bay', 'white-bay', 'Sidi Heneish', 31.0300, 27.6200, 'https://images.unsplash.com/photo-1765279162736-14c7d64ff820?auto=format&fit=crop&w=800&q=80'),
  ('Marseilia', 'marseilia', 'Sidi Abdel Rahman', 30.8500, 28.6000, 'https://images.unsplash.com/photo-1716469860914-ba79afa7491d?auto=format&fit=crop&w=800&q=80')
on conflict (slug) do nothing;

insert into public.amenities (name, icon, category) values
  ('Wi-Fi', 'wifi', 'comfort'),
  ('Air conditioning', 'snowflake', 'comfort'),
  ('TV', 'tv', 'comfort'),
  ('Pool access', 'waves', 'outdoor'),
  ('Beach access', 'umbrella', 'outdoor'),
  ('Parking', 'car', 'outdoor'),
  ('Washing machine', 'washing-machine', 'kitchen'),
  ('Dishwasher', 'utensils', 'kitchen'),
  ('Microwave', 'microwave', 'kitchen'),
  ('Coffee machine', 'coffee', 'kitchen')
on conflict (name) do nothing;

-- Demo owner + a few published properties, so the search/detail pages have
-- something real to render in development. Inserting into auth.users
-- directly (rather than public.profiles) is required because profiles.id
-- has a foreign key to it — this fires the handle_new_user trigger from
-- 0001_init.sql, which creates the matching profiles row automatically.
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin,
  confirmation_token, recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'demo.owner@safesahel.dev',
  crypt('demo-password-123', gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Demo Owner"}',
  false, '', ''
)
on conflict (id) do nothing;

update public.profiles set role = 'owner' where id = '11111111-1111-1111-1111-111111111111';

insert into public.properties (
  id, owner_id, compound_id, title, slug, type, status,
  description, bedrooms, bathrooms, max_guests, view_type,
  pool_access, beach_access, price_per_night, day_use_enabled, day_use_price,
  verified, subscription_status, subscription_current_period_end
) values
  (
    '22222222-2222-2222-2222-222222222221',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'marassi'),
    'Chalet Zaha', 'chalet-zaha', 'chalet', 'published',
    'A bright, modern chalet a short walk from Marassi''s main beach, with an open kitchen and a sea-facing terrace.',
    3, 2, 6, 'sea_view',
    true, true, 4500, false, null,
    true, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'hacienda-bay'),
    'Villa Nour', 'villa-nour', 'villa', 'published',
    'A five-bedroom villa on Hacienda Bay''s lagoon, with a private pool and space for the whole family.',
    5, 4, 10, 'sea_view',
    true, false, 9000, true, 2500,
    true, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222223',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'telal'),
    'Telal Garden Apartment', 'telal-garden-apartment', 'apartment', 'published',
    'A quiet two-bedroom apartment overlooking Telal''s gardens, a few minutes from the beach club.',
    2, 1, 4, 'garden_view',
    false, false, 2200, false, null,
    false, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222224',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'amwaj'),
    'Amwaj Beachfront Twin House', 'amwaj-beachfront-twin', 'villa', 'published',
    'A four-bedroom twin house steps from Amwaj''s beach, with a shared pool and sea views from the terrace.',
    4, 3, 8, 'sea_view',
    true, true, 7800, true, 2200,
    true, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222225',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'seashell'),
    'Seashell Modern Chalet', 'seashell-modern-chalet', 'chalet', 'published',
    'A bright two-bedroom chalet in Seashell with easy pool access and a modern open-plan interior.',
    2, 2, 5, 'garden_view',
    true, false, 4200, true, 1400,
    true, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222226',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'fouka-bay'),
    'Fouka Bay Lagoon Villa', 'fouka-bay-lagoon-villa', 'villa', 'published',
    'A large six-bedroom villa on Fouka Bay''s lagoon, built for big family gatherings.',
    6, 5, 12, 'lagoon_view',
    true, false, 11500, false, null,
    true, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222227',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'almaza-bay'),
    'Almaza Bay Beach Retreat', 'almaza-bay-retreat', 'apartment', 'published',
    'A two-bedroom apartment a short walk from Almaza Bay''s turquoise water.',
    2, 1, 4, 'sea_view',
    false, true, 3600, false, null,
    false, 'active', now() + interval '1 month'
  ),
  (
    '22222222-2222-2222-2222-222222222228',
    '11111111-1111-1111-1111-111111111111',
    (select id from public.compounds where slug = 'caesar'),
    'Caesar Palm Chalet', 'caesar-palm-chalet', 'chalet', 'published',
    'A cozy two-bedroom chalet near Caesar''s palm-lined pool area.',
    2, 1, 4, 'garden_view',
    true, false, 3100, true, 1000,
    false, 'active', now() + interval '1 month'
  )
on conflict (id) do nothing;

insert into public.property_images (property_id, url, sort_order, is_cover) values
  ('22222222-2222-2222-2222-222222222221', 'https://picsum.photos/seed/chalet-zaha-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222221', 'https://picsum.photos/seed/chalet-zaha-2/1200/800', 1, false),
  ('22222222-2222-2222-2222-222222222222', 'https://picsum.photos/seed/villa-nour-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222222', 'https://picsum.photos/seed/villa-nour-2/1200/800', 1, false),
  ('22222222-2222-2222-2222-222222222223', 'https://picsum.photos/seed/telal-apt-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222224', 'https://picsum.photos/seed/amwaj-twin-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222225', 'https://picsum.photos/seed/seashell-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222226', 'https://picsum.photos/seed/fouka-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222227', 'https://picsum.photos/seed/almaza-1/1200/800', 0, true),
  ('22222222-2222-2222-2222-222222222228', 'https://picsum.photos/seed/caesar-1/1200/800', 0, true)
on conflict do nothing;

insert into public.property_amenities (property_id, amenity_id)
select '22222222-2222-2222-2222-222222222221'::uuid, id from public.amenities where name in ('Wi-Fi', 'Air conditioning', 'Pool access', 'Beach access')
union all
select '22222222-2222-2222-2222-222222222222'::uuid, id from public.amenities where name in ('Wi-Fi', 'Air conditioning', 'Pool access', 'Parking', 'Dishwasher')
union all
select '22222222-2222-2222-2222-222222222223'::uuid, id from public.amenities where name in ('Wi-Fi', 'Air conditioning', 'Washing machine')
union all
select '22222222-2222-2222-2222-222222222224'::uuid, id from public.amenities where name in ('Wi-Fi', 'Beach access', 'Pool access')
union all
select '22222222-2222-2222-2222-222222222225'::uuid, id from public.amenities where name in ('Wi-Fi', 'Pool access', 'TV')
union all
select '22222222-2222-2222-2222-222222222226'::uuid, id from public.amenities where name in ('Pool access', 'Parking', 'Wi-Fi')
union all
select '22222222-2222-2222-2222-222222222227'::uuid, id from public.amenities where name in ('Beach access', 'Air conditioning', 'Wi-Fi')
union all
select '22222222-2222-2222-2222-222222222228'::uuid, id from public.amenities where name in ('Pool access', 'Parking')
on conflict do nothing;
