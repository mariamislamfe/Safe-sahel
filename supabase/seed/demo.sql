-- ===========================================================================
-- Safe Sahel — DEMO DATA (safe to paste into the Supabase SQL Editor)
-- ===========================================================================
-- Creates demo accounts, listings and bookings so the whole flow can be tried
-- end to end. Requires migrations up to 0022.
--
-- Every demo account uses the password:  Demo@12345
--
--   Owner (verified)       owner1@demo.safesahel.test   نور الدين — 3 listings
--   Owner (verified)       owner2@demo.safesahel.test   مريم — 3 listings
--   Owner (NOT verified)   owner3@demo.safesahel.test   كريم — 1 draft listing
--   Guest                  guest1@demo.safesahel.test   سارة — 1 pending + 1 confirmed booking
--   Guest                  guest2@demo.safesahel.test   أحمد — past stays with reviews + 1 pending
--
-- Running it twice does nothing the second time. Remove everything with
-- supabase/seed/demo-clean.sql (or delete the users from Admin → Users).
-- Photos: the cover is a real coastal photo, the rest are placeholders.
-- ===========================================================================

do $seed$
declare
  pw text := extensions.crypt('Demo@12345', extensions.gen_salt('bf'));
  o1 uuid := 'de000000-0000-4000-8000-000000000001';
  o2 uuid := 'de000000-0000-4000-8000-000000000002';
  o3 uuid := 'de000000-0000-4000-8000-000000000003';
  g1 uuid := 'de000000-0000-4000-8000-000000000011';
  g2 uuid := 'de000000-0000-4000-8000-000000000012';
  p_marassi uuid := 'de000000-0000-4000-8000-000000000101';
  p_hacienda uuid := 'de000000-0000-4000-8000-000000000102';
  p_lagoon uuid := 'de000000-0000-4000-8000-000000000103';
  p_studio uuid := 'de000000-0000-4000-8000-000000000104';
  p_telal uuid := 'de000000-0000-4000-8000-000000000105';
  p_lavista uuid := 'de000000-0000-4000-8000-000000000106';
  p_draft uuid := 'de000000-0000-4000-8000-000000000107';
  u record;
  l record;
  i integer;
  b_id uuid;
  d date := (now() at time zone 'Africa/Cairo')::date;
begin
  if exists (select 1 from auth.users where id = o1) then
    raise notice 'Demo data already exists — nothing to do. Run demo-clean.sql first to reset it.';
    return;
  end if;

  -- ---- accounts ------------------------------------------------------------
  for u in
    select * from (values
      (o1, 'owner1@demo.safesahel.test', 'نور الدين حسن', 'owner', '01000000001'),
      (o2, 'owner2@demo.safesahel.test', 'مريم عادل', 'owner', '01000000002'),
      (o3, 'owner3@demo.safesahel.test', 'كريم سامي', 'owner', '01000000003'),
      (g1, 'guest1@demo.safesahel.test', 'سارة محمود', 'guest', '01000000011'),
      (g2, 'guest2@demo.safesahel.test', 'أحمد فؤاد', 'guest', '01000000012')
    ) as t(id, email, name, role, phone)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, pw, now(),
      now(), now(), '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', u.name, 'role', u.role, 'phone', u.phone,
                         'terms_version', 'demo', 'terms_accepted_at', now()),
      false, '', '', '', ''
    );
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (u.id::text, u.id,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
    -- handle_new_user() created the profile; make sure name/role/phone are set
    -- even if 0020 wasn't applied.
    update public.profiles set full_name = u.name, role = u.role::public.user_role, phone = u.phone
    where id = u.id;
  end loop;

  update public.profiles set verified = true, host_type = 'owner', legal_name = 'نور الدين حسن عبد الله'
  where id = o1;
  update public.profiles set verified = true, host_type = 'owner', legal_name = 'مريم عادل إبراهيم'
  where id = o2;

  -- ---- compounds (kept on cleanup — they're shared catalog data) ------------
  insert into public.compounds (name, slug, area, latitude, longitude, cover_image_url) values
    ('Marassi', 'marassi', 'Sidi Abdel Rahman', 30.8203, 28.6689, 'https://images.unsplash.com/photo-1608538810980-d29299cfbd6b?auto=format&fit=crop&w=800&q=80'),
    ('Hacienda Bay', 'hacienda-bay', 'Sidi Abdel Rahman', 30.8167, 28.6500, 'https://images.unsplash.com/photo-1655042490853-bbcbb76dedef?auto=format&fit=crop&w=800&q=80'),
    ('Almaza Bay', 'almaza-bay', 'Ras El Hekma', 31.1667, 27.9333, 'https://images.unsplash.com/photo-1749036856868-d8f81ed0a028?auto=format&fit=crop&w=800&q=80'),
    ('Telal', 'telal', 'Sidi Heneish', 31.0400, 27.6100, 'https://images.unsplash.com/photo-1758538025972-8f53032e33f4?auto=format&fit=crop&w=800&q=80'),
    ('La Vista Bay', 'la-vista-bay', 'Ras El Hekma', 31.1500, 27.9500, 'https://images.unsplash.com/photo-1707075108813-edefd7b3308d?auto=format&fit=crop&w=800&q=80')
  on conflict (slug) do nothing;

  -- ---- listings -----------------------------------------------------------
  for l in
    select * from (values
      (p_marassi, o1, 'marassi', 'شاليه مراسي بفيو على البحر', 'demo-marassi-sea-chalet', 'chalet',
       'شاليه دور أرضي بجنينة خاصة وفيو مباشر على البحر، خطوات من الشاطئ. مناسب للعائلات.',
       2, 2, 5, 'sea_view', true, true, 4500, 2, 'https://images.unsplash.com/photo-1608538810980-d29299cfbd6b?auto=format&fit=crop&w=1600&q=80'),
      (p_hacienda, o1, 'hacienda-bay', 'فيلا هاسيندا باي بحمام سباحة خاص', 'demo-hacienda-pool-villa', 'villa',
       'فيلا 4 أوض بحمام سباحة خاص وجنينة كبيرة، على بعد 5 دقايق من البحر. مثالية للتجمعات العائلية.',
       4, 4, 10, 'garden_view', true, false, 12500, 3, 'https://images.unsplash.com/photo-1655042490853-bbcbb76dedef?auto=format&fit=crop&w=1600&q=80'),
      (p_lagoon, o1, 'hacienda-bay', 'شاليه على اللاجون في هاسيندا', 'demo-hacienda-lagoon-chalet', 'chalet',
       'شاليه أوضتين بتراس على اللاجون، هادي ومناسب للأزواج والعائلات الصغيرة.',
       2, 1, 4, 'lagoon_view', false, true, 3200, 2, 'https://images.unsplash.com/photo-1582610116397-edb318620f90?auto=format&fit=crop&w=1600&q=80'),
      (p_studio, o2, 'almaza-bay', 'ستوديو ألمازا باي قريب من البحر', 'demo-almaza-studio', 'studio',
       'ستوديو مودرن لفردين، فيه مطبخ صغير وبلكونة، على بعد دقيقتين مشي من الشاطئ.',
       1, 1, 2, 'sea_view', true, false, 1800, 1, 'https://images.unsplash.com/photo-1749036856868-d8f81ed0a028?auto=format&fit=crop&w=1600&q=80'),
      (p_telal, o2, 'telal', 'شاليه تلال 3 أوض', 'demo-telal-family-chalet', 'chalet',
       'شاليه واسع 3 أوض في تلال، قريب من حمام السباحة الرئيسي. متاح كمان Day use.',
       3, 2, 7, 'garden_view', true, true, 5200, 2, 'https://images.unsplash.com/photo-1758538025972-8f53032e33f4?auto=format&fit=crop&w=1600&q=80'),
      (p_lavista, o2, 'la-vista-bay', 'فيلا لافيستا باي على البحر', 'demo-lavista-beach-villa', 'villa',
       'فيلا 5 أوض صف أول على البحر بفيو بانوراما. متاحة كمان إيجار شهري للطلبة في الشتا.',
       5, 5, 12, 'sea_view', true, true, 16000, 3, 'https://images.unsplash.com/photo-1707075108813-edefd7b3308d?auto=format&fit=crop&w=1600&q=80'),
      (p_draft, o3, 'marassi', 'شاليه مراسي (مسودة — المالك لسه مش موثّق)', 'demo-unverified-draft', 'chalet',
       'إعلان تجريبي عشان تشوف "ليه الإعلان مش ظاهر؟" لمالك لسه ما وثّقش بطاقته.',
       2, 1, 4, 'garden_view', false, true, 3000, 2, 'https://images.unsplash.com/photo-1688604693147-ff99ce13e291?auto=format&fit=crop&w=1600&q=80')
    ) as t(id, owner_id, compound_slug, title, slug, type, description, bedrooms, bathrooms, max_guests,
           view_type, beach_access, pool_access, price, min_stay, cover)
  loop
    insert into public.properties (
      id, owner_id, compound_id, title, slug, type, status, description,
      bedrooms, bathrooms, max_guests, view_type, beach_access, pool_access, parking,
      price_per_night, min_stay_nights, day_use_enabled, day_use_price,
      monthly_rental_enabled, monthly_price, cancellation_policy, unit_address
    ) values (
      l.id, l.owner_id, (select id from public.compounds where slug = l.compound_slug),
      l.title, l.slug, l.type::public.property_type, 'draft', l.description,
      l.bedrooms, l.bathrooms, l.max_guests, l.view_type::public.view_type, l.beach_access, l.pool_access, true,
      l.price, l.min_stay, l.id = p_telal, case when l.id = p_telal then 1500 end,
      l.id = p_lavista, case when l.id = p_lavista then 45000 end, 'moderate',
      'Demo ' || upper(substr(l.slug, 6, 3)) || '-' || (10 + l.bedrooms)
    );

    insert into public.property_images (property_id, url, sort_order, is_cover)
    values (l.id, l.cover, 0, true);
    -- The unverified owner's draft gets only 2 photos (another publish blocker).
    for i in 1 .. case when l.id = p_draft then 1 else 5 end loop
      insert into public.property_images (property_id, url, sort_order, is_cover)
      values (l.id, 'https://picsum.photos/seed/' || l.slug || '-' || i || '/1200/800', i, false);
    end loop;

    insert into public.property_amenities (property_id, amenity_id)
    select l.id, a.id from public.amenities a
    where a.name in ('Wi-Fi', 'Air conditioning', 'TV', 'Parking', 'Washing machine', 'Microwave')
       or (l.pool_access and a.name = 'Pool access')
       or (l.beach_access and a.name = 'Beach access')
    on conflict do nothing;
  end loop;

  -- Publish (the real publish rules run: photos, price, phone, verified owner, coverage).
  update public.properties set status = 'published', calendar_updated_at = now()
  where id in (p_marassi, p_hacienda, p_lagoon, p_studio, p_telal, p_lavista);

  -- ---- past stays + reviews (inserted directly: dates in the past) ---------
  insert into public.bookings (id, property_id, guest_id, check_in, check_out, nights, guests_count, adults_count,
                               base_price, deposit_amount, total_amount, status)
  values
    ('de000000-0000-4000-8000-000000000201', p_marassi, g2, d - 40, d - 37, 3, 4, 2, 13500, 2250, 15750, 'confirmed'),
    ('de000000-0000-4000-8000-000000000202', p_hacienda, g2, d - 25, d - 22, 3, 8, 4, 37500, 6250, 43750, 'confirmed'),
    ('de000000-0000-4000-8000-000000000203', p_studio, g2, d - 12, d - 10, 2, 2, 2, 3600, 900, 4500, 'confirmed');

  insert into public.reviews (booking_id, property_id, guest_id, rating_overall, rating_cleanliness,
                              rating_accuracy, rating_location, rating_value, comment)
  values
    ('de000000-0000-4000-8000-000000000201', p_marassi, g2, 5, 5, 5, 5, 4,
     'الشاليه نضيف جداً والفيو تحفة. نور الدين كان متعاون ورد علينا بسرعة على واتساب.'),
    ('de000000-0000-4000-8000-000000000202', p_hacienda, g2, 4, 4, 5, 4, 4,
     'الفيلا واسعة وحمام السباحة كان نضيف. التكييف في أوضة واحدة كان ضعيف شوية.');

  insert into public.guest_reviews (booking_id, owner_id, guest_id, rating, comment)
  values ('de000000-0000-4000-8000-000000000201', o1, g2, 5, 'ضيف محترم وسلّم الشاليه زي ما استلمه.');

  -- ---- live requests through the real RPCs (as if each user clicked) -------
  -- سارة: request on the pool villa → stays pending (owner1 sees it waiting).
  perform set_config('request.jwt.claim.sub', g1::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', g1, 'role', 'authenticated')::text, true);
  perform public.request_booking(p_hacienda, d + 20, d + 23, 6, 4, 'هنوصل حوالي الساعة 3 العصر إن شاء الله');

  -- سارة: request on the Marassi chalet → owner1 confirms it below.
  select booking_id into b_id from public.request_booking(p_marassi, d + 10, d + 13, 4, 2, null);

  perform set_config('request.jwt.claim.sub', o1::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', o1, 'role', 'authenticated')::text, true);
  perform public.respond_to_booking(b_id, 'confirm', null);

  -- أحمد: pending request on the Telal chalet (owner2 sees it waiting).
  perform set_config('request.jwt.claim.sub', g2::text, true);
  perform set_config('request.jwt.claims', json_build_object('sub', g2, 'role', 'authenticated')::text, true);
  perform public.request_booking(p_telal, d + 30, d + 33, 5, 2, 'ممكن نعرف لو فيه شماسي على البحر؟');

  -- An owner-blocked weekend on the studio calendar.
  insert into public.availability_blocks (property_id, range, reason)
  values (p_studio, daterange(d + 5, d + 7), 'owner_blocked');

  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  raise notice 'Demo data created. Log in with any demo email and the password Demo@12345.';
end
$seed$;
