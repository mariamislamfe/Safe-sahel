// Database integration tests for migrations 0001–0020 (+ down/up round trip),
// run against PGlite (WASM Postgres) with stubbed Supabase auth/storage schemas.
//
//   mkdir /tmp/pg && cd /tmp/pg && npm i @electric-sql/pglite@0.2.17
//   cp <repo>/supabase/tests/migrations.test.mjs . && node migrations.test.mjs <repo>/supabase/migrations
//
// ~75 assertions: cleanup, publish gate, verification, booking lifecycle, guest-ID
// access + logging, checklist, strikes, expiry, pricing, broker discount,
// featured caps, analytics, maintenance, privilege lockdown, reversibility.

import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import fs from "node:fs";
import path from "node:path";

const MIG = process.argv[2];
const db = new PGlite({ extensions: { btree_gist, pg_trgm } });

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log("  ✓", msg);
  else {
    failures++;
    console.log("  ✗ FAIL:", msg);
  }
};

const stub = `
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
grant usage on schema storage to anon, authenticated;
grant all on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
create publication supabase_realtime;
`;

async function exec(sql, label) {
  try {
    await db.exec(sql);
  } catch (e) {
    console.log(`ERROR in ${label}: ${e.message}`);
    if (e.where) console.log("  where:", e.where);
    if (e.position)
      console.log(
        "  position:",
        e.position,
        sql.slice(Math.max(0, e.position - 200), Number(e.position) + 100),
      );
    throw e;
  }
}

async function as(uid, fn) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`,
  );
  try {
    return await fn();
  } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
async function q(sql, params) {
  return (await db.query(sql, params)).rows;
}
async function expectError(promise, contains, msg) {
  try {
    await promise;
    ok(false, `${msg} (expected error containing "${contains}", got success)`);
  } catch (e) {
    ok(e.message.includes(contains), `${msg} → ${e.message}`);
  }
}

const U = {
  admin: "a0000000-0000-0000-0000-000000000001",
  owner: "a0000000-0000-0000-0000-000000000002",
  guest: "a0000000-0000-0000-0000-000000000003",
  broker: "a0000000-0000-0000-0000-000000000004",
  owner2: "a0000000-0000-0000-0000-000000000005",
  demo: "11111111-1111-1111-1111-111111111111",
};

await exec(stub, "stub");
try {
  const files = fs
    .readdirSync(MIG)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  for (const f of files.filter((f) => f < "0017"))
    await exec(fs.readFileSync(path.join(MIG, f), "utf8"), f);
  console.log("applied", files.filter((f) => f < "0017").length, "legacy migrations");

  // ---- production-like data -------------------------------------------------
  await exec(
    `
insert into auth.users (id, email, raw_user_meta_data) values
 ('${U.admin}', 'a@x', '{"full_name":"Admin"}'),
 ('${U.owner}', 'o@x', '{"full_name":"Owner One","role":"owner"}'),
 ('${U.guest}', 'g@x', '{"full_name":"Guest"}'),
 ('${U.broker}', 'b@x', '{"full_name":"Broker","role":"owner"}'),
 ('${U.owner2}', 'o2@x', '{"full_name":"Owner Two","role":"owner"}'),
 ('${U.demo}', 'demo@x', '{"full_name":"Demo Owner","role":"owner"}');
update public.profiles set role = 'admin' where id = '${U.admin}';
update public.profiles set phone = '01012345678' where id = '${U.owner}';
insert into public.compounds (name, slug, area) values ('Marassi','marassi','SAR'),('Amwaj','amwaj','SH'),('Marina','marina','Alamein'),('مراسي','property',null);
insert into public.properties (id, owner_id, compound_id, title, slug, type, status, price_per_night, subscription_status)
select gen_random_uuid(), '${U.demo}', (select id from compounds where slug='property'), t, 'p-'||md5(t||random()), 'chalet', 'published', 500, 'active'
from unnest(array['تاتا','تاتا','يمنبمنيستلهم']) t;
insert into public.properties (id, owner_id, compound_id, title, slug, type, status, price_per_night, subscription_status)
values ('22222222-2222-2222-2222-222222222221', '${U.demo}', (select id from compounds where slug='marassi'), 'Chalet Zaha', 'chalet-zaha', 'chalet', 'published', 4500, 'active');
insert into public.property_images (property_id, url, is_cover) values ('22222222-2222-2222-2222-222222222221','u1',true),('22222222-2222-2222-2222-222222222221','u2',false);
insert into public.bookings (id, property_id, guest_id, check_in, check_out, nights, base_price, total_amount, status)
values ('b0000000-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222221','${U.guest}','2027-07-01','2027-07-03',2,9000,9000,'pending_payment');
insert into public.availability_blocks (property_id, range, reason, booking_id) values ('22222222-2222-2222-2222-222222222221','[2027-07-01,2027-07-03)','pending_hold','b0000000-0000-0000-0000-000000000001');
`,
    "seed",
  );

  for (const f of ["0017_booking_status_values.sql", "0018_business_alignment.sql"]) {
    await exec(fs.readFileSync(path.join(MIG, f), "utf8"), f);
    console.log("applied", f);
  }

  console.log("\n== Cleanup ==");
  let rows = await q(
    `select title, status, unpublished_reason, (select slug from compounds c where c.id = compound_id) slug from properties order by title`,
  );
  for (const r of rows) console.log("   ", r);
  ok(
    rows
      .filter((r) => r.title === "تاتا" || r.title === "يمنبمنيستلهم")
      .every(
        (r) =>
          r.status === "draft" && r.unpublished_reason === "test_listing" && r.slug === "marassi",
      ),
    "test listings unpublished + moved to Marassi",
  );
  ok(
    rows.find((r) => r.title === "Chalet Zaha").status === "draft",
    "demo listing (2 photos, unverified owner) unpublished",
  );
  rows = await q(
    `select name, is_focus, focus_rank, hidden, merged_into is not null merged from compounds order by focus_rank nulls last, name`,
  );
  ok(
    rows.find((r) => r.name === "مراسي").hidden && rows.find((r) => r.name === "مراسي").merged,
    "مراسي hidden + merged",
  );
  ok(
    rows
      .filter((r) => r.is_focus)
      .map((r) => r.name)
      .join(",") === "Porto Golf Marina,Amwaj,Aqua View,Marina,Stella",
    "5 focus compounds in order",
  );
  rows = await q(`select status, reference, expires_at is not null exp from bookings`);
  ok(
    rows[0].status === "pending" && rows[0].reference.startsWith("SS-") && rows[0].exp,
    "legacy pending_payment → pending with reference + expiry",
  );
  ok(
    (await q(`select count(*)::int c from availability_blocks`))[0].c === 0,
    "pending holds released",
  );
  ok(
    (await q(`select count(*)::int c from listing_duplicate_flags`))[0].c >= 1,
    "duplicate تاتا listings flagged",
  );

  console.log("\n== Owner publish gate + verification ==");
  const P1 = "33333333-3333-3333-3333-333333333331";
  await as(U.owner, () =>
    q(
      `insert into properties (id, owner_id, compound_id, title, slug, type, status, price_per_night) values ($1, $2, (select id from compounds where slug='amwaj'), 'Amwaj Sea Chalet', 'amwaj-sea', 'chalet', 'draft', 6000)`,
      [P1, U.owner],
    ),
  );
  await as(U.owner, () => q(`update properties set max_guests = 6 where id = $1`, [P1]));
  await expectError(
    as(U.owner, () => q(`update properties set status='published' where id=$1`, [P1])),
    "min_photos",
    "publish blocked w/o photos",
  );
  await expectError(
    as(U.owner, () => q(`update properties set status='published' where id=$1`, [P1])),
    "owner_not_verified",
    "publish blocked for unverified owner",
  );
  await as(U.owner, () =>
    q(
      `insert into property_images (property_id, url, content_hash) select $1, 'img'||g, 'h'||g from generate_series(1,5) g`,
      [P1],
    ),
  );
  await expectError(
    as(U.owner, () =>
      q(
        `insert into verification_requests (profile_id, full_name, phone, id_document_url) values ($1,'Owner One','010','${U.owner}/x.jpg')`,
        [U.owner],
      ),
    ),
    "consent_required",
    "verification requires consent",
  );
  await expectError(
    as(U.owner, () =>
      q(
        `insert into verification_requests (profile_id, full_name, phone, id_document_url, consent_at, consent_version) values ($1,'Owner One','010','someoneelse/x.jpg', now(), 'v1')`,
        [U.owner],
      ),
    ),
    "invalid_document_path",
    "verification path must be in own folder",
  );
  const [vr] = await as(U.owner, () =>
    q(
      `insert into verification_requests (profile_id, full_name, phone, id_document_url, ownership_proof_path, ownership_proof_type, consent_at, consent_version, status) values ($1,'Owner One','010','${U.owner}/id.jpg','${U.owner}/proof.jpg','compound_card', now(), 'v1', 'approved') returning id, status`,
      [U.owner],
    ),
  );
  ok(vr.status === "pending", "self-approved status forced back to pending");
  await as(U.owner, () =>
    q(`update profiles set verified = true, legal_name='Fake' where id=$1`, [U.owner]),
  );
  ok(
    (await q(`select verified, legal_name from profiles where id=$1`, [U.owner]))[0].verified ===
      false,
    "owner can't self-verify / set legal name",
  );
  await expectError(
    as(U.owner, () => q(`select review_verification($1, true, 'x')`, [vr.id])),
    "not_authorized",
    "non-admin can't review",
  );
  await as(U.admin, () => q(`select review_verification($1, true, 'محمد أحمد علي')`, [vr.id]));
  ok(
    (await q(`select verified, legal_name, host_type from profiles where id=$1`, [U.owner]))[0]
      .legal_name === "محمد أحمد علي",
    "admin approval sets legal name",
  );
  await as(U.owner, () => q(`update properties set status='published' where id=$1`, [P1]));
  ok(
    (
      await q(`select status, first_published_at is not null fp from properties where id=$1`, [P1])
    )[0].fp,
    "verified owner with 5 photos publishes",
  );
  const blockers = await as(U.owner, () => q(`select property_publish_blockers($1) b`, [P1]));
  ok(blockers[0].b.length === 0, "no blockers on live listing");
  await as(U.owner, () =>
    q(`update properties set featured = true, flagged_for_review = true where id=$1`, [P1]),
  );
  ok(
    (await q(`select featured, flagged_for_review from properties where id=$1`, [P1]))[0]
      .featured === false,
    "owner can't self-feature / clear flags",
  );

  console.log("\n== Booking flow ==");
  await expectError(
    as(U.guest, () =>
      q(
        `insert into bookings (property_id, guest_id, check_in, check_out, nights, base_price, total_amount, status) values ($1,$2,'2027-08-01','2027-08-03',2,1,1,'confirmed')`,
        [P1, U.guest],
      ),
    ),
    "row-level security",
    "guest can't insert bookings directly",
  );
  const [req] = await as(U.guest, () =>
    q(`select * from request_booking($1, '2027-08-01', '2027-08-04', 4, 2, 'hi')`, [P1]),
  );
  ok(req.reference.startsWith("SS-"), `request_booking → ${req.reference}`);
  let b = (
    await q(
      `select status, base_price, nights, expires_at > now() + interval '23 hours' exp from bookings where id=$1`,
      [req.booking_id],
    )
  )[0];
  ok(
    b.status === "pending" && Number(b.base_price) === 18000 && b.exp,
    "pending, price = nights × nightly, 24h expiry",
  );
  ok(
    (await q(`select count(*)::int c from availability_blocks where property_id=$1`, [P1]))[0].c ===
      0,
    "pending request does NOT block dates",
  );
  await expectError(
    as(U.guest, () => q(`select * from request_booking($1, '2027-08-02', '2027-08-03', 2)`, [P1])),
    "duplicate_request",
    "no duplicate overlapping request",
  );
  const [req2] = await as(U.owner2, () =>
    q(`select * from request_booking($1, '2027-08-02', '2027-08-05', 2)`, [P1]),
  );
  let contact = (
    await as(U.guest, () => q(`select get_booking_contact($1) c`, [req.booking_id]))
  )[0].c;
  ok(!contact.owner_legal_name, "legal name hidden before confirmation");
  await expectError(
    as(U.guest, () => q(`select respond_to_booking($1, 'confirm')`, [req.booking_id])),
    "not_authorized",
    "guest can't confirm",
  );
  await as(U.owner, () => q(`select respond_to_booking($1, 'confirm')`, [req.booking_id]));
  ok(
    (
      await q(
        `select count(*)::int c from availability_blocks where booking_id=$1 and reason='booked'`,
        [req.booking_id],
      )
    )[0].c === 1,
    "confirm blocks dates",
  );
  ok(
    (await q(`select status, decline_reason from bookings where id=$1`, [req2.booking_id]))[0]
      .decline_reason === "dates_taken",
    "overlapping pending auto-declined",
  );
  contact = (await as(U.guest, () => q(`select get_booking_contact($1) c`, [req.booking_id])))[0].c;
  ok(
    contact.owner_legal_name === "محمد أحمد علي" && contact.owner_phone === "01012345678",
    "guest sees legal name + phone after confirm",
  );
  await expectError(
    as(U.guest, () => q(`select * from request_booking($1, '2027-08-02', '2027-08-03', 2)`, [P1])),
    "dates_unavailable",
    "confirmed dates unavailable",
  );

  console.log("\n== Guest IDs + document access ==");
  await expectError(
    as(U.guest, () => q(`select register_guest_id($1, 'x/y/z.jpg', 'G', 'v1')`, [req.booking_id])),
    "invalid_document_path",
    "ID path enforced",
  );
  const gidPath = `${U.guest}/${req.booking_id}/abc.jpg`;
  await as(U.guest, () =>
    q(`insert into storage.objects (bucket_id, name) values ('guest-ids', $1)`, [gidPath]),
  );
  const [{ register_guest_id: gid }] = await as(U.guest, () =>
    q(`select register_guest_id($1, $2, 'Guest Adult 1', 'v1')`, [req.booking_id, gidPath]),
  );
  await as(U.guest, () =>
    q(`select register_guest_id($1, $2, 'Guest Adult 2', 'v1')`, [req.booking_id, gidPath]),
  );
  await expectError(
    as(U.guest, () =>
      q(`select register_guest_id($1, $2, 'Third', 'v1')`, [req.booking_id, gidPath]),
    ),
    "all_ids_uploaded",
    "no more IDs than adults",
  );
  await expectError(
    as(U.owner2, () =>
      q(`insert into storage.objects (bucket_id, name) values ('guest-ids', $1)`, [
        `${U.owner2}/${req.booking_id}/x.jpg`,
      ]),
    ),
    "row-level security",
    "can't upload IDs to someone else's booking",
  );
  ok(
    (
      await as(U.guest, () =>
        q(`select count(*)::int c from storage.objects where bucket_id='guest-ids'`),
      )
    )[0].c === 0,
    "no direct read of guest-ids bucket",
  );
  const acc = await as(U.owner, () =>
    q(`select * from authorize_document_access('guest_id', $1)`, [gid]),
  );
  ok(acc[0].bucket === "guest-ids", "owner of confirmed booking can access guest ID");
  await expectError(
    as(U.guest, () => q(`select * from authorize_document_access('guest_id', $1)`, [gid])),
    "not_authorized",
    "guest themself not in allow-list",
  );
  await expectError(
    as(U.owner, () => q(`select * from authorize_document_access('verification_id', $1)`, [vr.id])),
    "not_authorized",
    "owner docs admin-only",
  );
  await as(U.admin, () =>
    q(`select * from authorize_document_access('verification_id', $1)`, [vr.id]),
  );
  ok(
    (await q(`select count(*)::int c from document_access_log`))[0].c === 2,
    "every access logged",
  );

  console.log("\n== Check-in checklist ==");
  await as(U.owner, () =>
    q(`select save_checkin_checklist($1, '[{"key":"ac","ok":true}]'::jsonb, 'all good')`, [
      req.booking_id,
    ]),
  );
  await as(U.owner, () => q(`select confirm_checkin_checklist($1)`, [req.booking_id]));
  await as(U.guest, () =>
    q(
      `select save_checkin_checklist($1, '[{"key":"ac","ok":false,"note":"noisy"}]'::jsonb, 'all good')`,
      [req.booking_id],
    ),
  );
  ok(
    (
      await q(`select owner_confirmed_at from checkin_checklists where booking_id=$1`, [
        req.booking_id,
      ])
    )[0].owner_confirmed_at === null,
    "edit resets confirmations",
  );
  await as(U.guest, () => q(`select confirm_checkin_checklist($1)`, [req.booking_id]));
  await as(U.owner, () => q(`select confirm_checkin_checklist($1)`, [req.booking_id]));
  await expectError(
    as(U.owner, () => q(`select save_checkin_checklist($1, '[]'::jsonb)`, [req.booking_id])),
    "checklist_locked",
    "locked after both confirm",
  );
  await expectError(
    as(U.owner2, () => q(`select save_checkin_checklist($1, '[]'::jsonb)`, [req.booking_id])),
    "not_authorized",
    "outsider can't edit",
  );

  console.log("\n== Strikes + expiry ==");
  await as(U.owner, () => q(`select cancel_booking($1, 'family')`, [req.booking_id]));
  ok(
    (await q(`select count(*)::int c from owner_strikes where owner_id=$1`, [U.owner]))[0].c === 1,
    "owner cancel of confirmed → strike",
  );
  const [r3] = await as(U.guest, () =>
    q(`select * from request_booking($1, '2027-09-01', '2027-09-03', 2)`, [P1]),
  );
  await as(U.owner, () => q(`select respond_to_booking($1, 'confirm')`, [r3.booking_id]));
  await as(U.owner, () => q(`select cancel_booking($1, null)`, [r3.booking_id]));
  ok(
    (await q(`select flagged_for_review, flag_reason from properties where id=$1`, [P1]))[0]
      .flag_reason === "strikes",
    "2 strikes → listing flagged",
  );
  const [r4] = await as(U.guest, () =>
    q(`select * from request_booking($1, '2027-10-01', '2027-10-03', 2)`, [P1]),
  );
  await q(`update bookings set expires_at = now() - interval '1 minute' where id=$1`, [
    r4.booking_id,
  ]);
  ok(
    (await as(U.owner, () => q(`select respond_to_booking($1, 'confirm') r`, [r4.booking_id])))[0]
      .r === "expired",
    "can't confirm after 24h → 'expired'",
  );
  ok(
    (await q(`select status from bookings where id=$1`, [r4.booking_id]))[0].status === "expired",
    "stale request expired",
  );
  const [r5] = await as(U.guest, () =>
    q(`select * from request_booking($1, '2027-11-01', '2027-11-03', 2)`, [P1]),
  );
  await as(U.guest, () => q(`select cancel_booking($1, 'changed plans')`, [r5.booking_id]));
  ok(
    (await q(`select status, cancelled_by from bookings where id=$1`, [r5.booking_id]))[0]
      .cancelled_by === "guest",
    "guest cancels pending request",
  );

  console.log("\n== Subscriptions, payments, featured ==");
  const quote = await as(U.owner, () =>
    q(`select * from quote_subscription(array[$1]::uuid[], 'monthly')`, [P1]),
  );
  ok(
    quote[0].tier === "launch" && quote[0].amount === 500,
    `monthly launch quote = ${quote[0].amount}`,
  );
  const sq = await as(U.owner, () =>
    q(`select * from quote_subscription(array[$1]::uuid[], 'season')`, [P1]),
  );
  ok(sq[0].amount === 2000, "season = 2000");
  await q(
    `update platform_settings set value='"2020-01-01T00:00:00+02:00"' where key='launch_pricing_until'`,
  );
  await q(
    `update platform_settings set value='"2020-01-01T00:00:00+02:00"' where key='founder_price_lock_until'`,
  );
  const premium = await as(U.owner, () =>
    q(`select * from quote_subscription(array[$1]::uuid[], 'annual')`, [P1]),
  );
  ok(
    premium[0].tier === "premium" && premium[0].amount === 13500,
    `year-2 6000/night → premium annual 13500`,
  );
  await q(
    `update platform_settings set value='"2028-04-01T00:00:00+02:00"' where key='launch_pricing_until'`,
  );
  await q(
    `update platform_settings set value='"2029-04-01T00:00:00+02:00"' where key='founder_price_lock_until'`,
  );
  const payId = (
    await as(U.owner, () =>
      q(
        `select submit_payment('subscription','monthly', array[$1]::uuid[], null, 'IP-123', $2) id`,
        [P1, `${U.owner}/proof.png`],
      ),
    )
  )[0].id;
  ok(
    (await q(`select amount_egp from subscription_payments where id=$1`, [payId]))[0].amount_egp ===
      500,
    "payment amount computed server-side",
  );
  await expectError(
    as(U.owner, () => q(`select approve_payment($1)`, [payId])),
    "not_authorized",
    "owner can't approve own payment",
  );
  await as(U.admin, () => q(`select approve_payment($1)`, [payId]));
  const sub = (
    await q(`select starts_at, ends_at, tier from listing_subscriptions where payment_id=$1`, [
      payId,
    ])
  )[0];
  console.log("    subscription:", sub);
  ok(
    new Date(sub.starts_at).toISOString().startsWith("2027-03-31T22:00"),
    "paid time starts when the free period ends",
  );
  await expectError(
    as(U.owner, () =>
      q(
        `select submit_payment('subscription','student_winter', array[$1]::uuid[], null, 'IP', null)`,
        [P1],
      ),
    ),
    "student_plan_requires_monthly_rental",
    "student plan needs monthly rental",
  );
  // featured cap
  const compound = (await q(`select compound_id from properties where id=$1`, [P1]))[0].compound_id;
  for (let i = 0; i < 3; i++) {
    const id = `44444444-4444-4444-4444-44444444444${i}`;
    await q(
      `insert into properties (id, owner_id, compound_id, title, slug, type, status, price_per_night) values ($1, $2, $3, 'Other '||$4, 'o'||$4, 'villa', 'draft', 9000)`,
      [id, U.owner2, compound, i],
    );
    await q(`select grant_featured_slot($1, 7, 'admin')`, [id]);
  }
  const fp = (
    await as(U.owner, () =>
      q(`select submit_payment('featured', null, array[$1]::uuid[], 2, 'IP-F', null) id`, [P1]),
    )
  )[0].id;
  ok(
    (await q(`select amount_egp from subscription_payments where id=$1`, [fp]))[0].amount_egp ===
      600,
    "featured 2 weeks = 600",
  );
  await expectError(
    as(U.admin, () => q(`select approve_payment($1)`, [fp])),
    "featured_slots_full",
    "max 3 featured per compound",
  );
  await expectError(
    as(U.owner, () => q(`select claim_founder_featured($1)`, [P1])),
    "featured_slots_full",
    "founder free slot also respects cap",
  );

  console.log("\n== Broker ==");
  const P2 = "55555555-5555-5555-5555-555555555551";
  await as(U.broker, () =>
    q(
      `insert into properties (id, owner_id, compound_id, title, slug, type, price_per_night) values ($1,$2,(select id from compounds where slug='marina'),'Marina Twin','marina-twin','twin_house', 3000)`,
      [P2, U.broker],
    ),
  );
  await as(U.broker, () =>
    q(
      `insert into property_images (property_id, url) select $1, 'b'||g from generate_series(1,5) g`,
      [P2],
    ),
  );
  const [bvr] = await as(U.broker, () =>
    q(
      `insert into verification_requests (profile_id, kind, full_name, phone, id_document_url, consent_at, consent_version) values ($1,'broker','Broker B','011','${U.broker}/id.jpg', now(),'v1') returning id`,
      [U.broker],
    ),
  );
  await as(U.admin, () => q(`select review_verification($1, true, 'Broker Legal')`, [bvr.id]));
  await expectError(
    as(U.broker, () => q(`update properties set status='published' where id=$1`, [P2])),
    "missing_authorization",
    "broker needs per-listing authorization",
  );
  const [auth] = await as(U.broker, () =>
    q(
      `insert into broker_authorizations (property_id, broker_id, document_path, owner_full_name, consent_at, consent_version, status) values ($1,$2,'${U.broker}/auth.pdf','Real Owner', now(), 'v1', 'approved') returning id, status`,
      [P2, U.broker],
    ),
  );
  ok(auth.status === "pending", "broker can't self-approve authorization");
  await as(U.admin, () => q(`select review_broker_authorization($1, true)`, [auth.id]));
  await as(U.broker, () => q(`update properties set status='published' where id=$1`, [P2]));
  ok(
    (await q(`select status from properties where id=$1`, [P2]))[0].status === "published",
    "approved broker + authorization publishes",
  );
  for (let i = 0; i < 4; i++)
    await as(U.broker, () =>
      q(
        `insert into properties (owner_id, title, slug, type, price_per_night) values ($1, 'B'||$2, 'bb'||$2, 'chalet', 2000)`,
        [U.broker, i],
      ),
    );
  const bq = await as(U.broker, () =>
    q(`select * from quote_subscription(array[$1]::uuid[], 'monthly')`, [P2]),
  );
  ok(bq[0].discount_pct === 15 && bq[0].amount === 425, "broker with 5 listings → 15% off (425)");
  await expectError(
    as(U.broker, () =>
      q(
        `insert into properties (owner_id, compound_id, title, slug, type, price_per_night, unit_address) values ($1,(select id from compounds where slug='marina'),'X','x1','chalet',1,'B12-3'), ($1,(select id from compounds where slug='marina'),'Y','y1','chalet',1,'b12 3')`,
        [U.broker],
      ),
    ),
    "properties_unique_unit_per_compound",
    "same unit in same compound can't be listed twice",
  );

  console.log("\n== Admin revoke, analytics, maintenance ==");
  await as(U.admin, () => q(`select revoke_verification($1, 'fake docs')`, [U.broker]));
  ok(
    (
      await q(`select status, unpublished_reason from properties where id=$1`, [P2])
    )[0].unpublished_reason.includes("broker_not_approved"),
    "revoking badge unpublishes listings",
  );
  await db.exec(`set role anon;`);
  await q(`select track_listing_event('view', $1, 'sess-1')`, [P1]);
  await q(`select track_listing_event('view', $1, 'sess-1')`, [P1]);
  await q(`select track_listing_event('view', $1, 'sess-2')`, [P1]);
  await q(`select track_listing_event('whatsapp_click', $1, 'sess-2')`, [P1]);
  await q(`select track_listing_event('site_visit', null, 'sess-2')`);
  await expectError(
    q(`select request_booking($1, '2027-12-01','2027-12-02',1)`, [P1]),
    "permission denied",
    "anon can't request bookings",
  );
  await db.exec(`reset role;`);
  const stats = await as(U.owner, () =>
    q(
      `select * from owner_listing_stats(now() - interval '1 day', now() + interval '1 day') where property_id=$1`,
      [P1],
    ),
  );
  console.log("    owner stats:", stats[0]);
  ok(
    stats[0].views === 2 &&
      stats[0].whatsapp_clicks === 1 &&
      stats[0].booking_requests === 5 &&
      Number(stats[0].booking_value) === 30000 &&
      stats[0].confirmed_bookings === 2,
    "owner monthly stats (deduped views)",
  );
  const kpis = await as(U.admin, () => q(`select * from admin_weekly_kpis(2)`));
  console.log("    kpis:", kpis);
  ok(kpis.length === 2, "weekly KPIs");
  await expectError(
    as(U.owner, () => q(`select * from admin_weekly_kpis(2)`)),
    "not_authorized",
    "KPIs admin-only",
  );
  const maint = (await q(`select run_daily_maintenance() m`))[0].m;
  console.log("    maintenance:", maint);
  await expectError(
    as(U.owner, () => q(`select run_daily_maintenance()`)),
    "permission denied",
    "maintenance not callable by users",
  );
  ok((await q(`select enqueue_calendar_reminders() c`))[0].c >= 1, "calendar reminders enqueued");
  const gs = await as(U.admin, () => q(`select * from guarantee_status()`));
  ok(Array.isArray(gs), "guarantee_status runs");
  await expectError(
    as(U.owner, () => q(`select redeem_subscription_code($1, '0000')`, [P1])),
    "subscription_codes_retired",
    "0000 backdoor closed",
  );
  await as(U.owner, () => q(`update properties set status='suspended' where id=$1`, [P1]));
  ok(
    (await q(`select status from properties where id=$1`, [P1]))[0].status === "published",
    "owner can't set suspended",
  );
  await as(U.admin, () =>
    q(`update properties set status='suspended', unpublished_reason='admin' where id=$1`, [P1]),
  );
  await as(U.owner, () => q(`update properties set status='published' where id=$1`, [P1]));
  ok(
    (await q(`select status from properties where id=$1`, [P1]))[0].status === "suspended",
    "owner can't lift a suspension",
  );
  await as(U.owner, () => q(`delete from properties where id=$1`, [P1]));
  ok(
    (await q(`select count(*)::int c from properties where id=$1`, [P1]))[0].c === 1,
    "listing still exists after owner delete attempt",
  );

  console.log("\n== 0019 team roles ==");
  await exec(fs.readFileSync(path.join(MIG, "0019_staff_roles.sql"), "utf8"), "0019");
  const STAFF = "a0000000-0000-0000-0000-000000000009";
  await exec(
    `insert into auth.users (id, email, raw_user_meta_data) values ('${STAFF}', 'Staff@x', '{"full_name":"Staff"}');`,
    "staff user",
  );
  ok(
    (await as(STAFF, () => q(`select my_admin_access() a`)))[0].a === null,
    "non-team user has no admin access",
  );
  await expectError(
    as(U.owner, () => q(`select admin_upsert_staff('staff@x', 'Ops', array['verification'])`)),
    "not_authorized",
    "only founder adds team members",
  );
  await expectError(
    as(U.admin, () => q(`select admin_upsert_staff('staff@x', 'Ops', array['hacking'])`)),
    "staff_members_known_permissions",
    "unknown permission rejected",
  );
  await expectError(
    as(U.admin, () => q(`select admin_upsert_staff('nobody@x', 'Ops', array['verification'])`)),
    "user_not_found",
    "unknown email rejected",
  );
  await as(U.admin, () => q(`select admin_upsert_staff('staff@x', 'Ops', array['verification'])`));
  const staffAcc = (await as(STAFF, () => q(`select my_admin_access() a`)))[0].a;
  ok(
    staffAcc.founder === false &&
      staffAcc.title === "Ops" &&
      staffAcc.permissions.join() === "verification",
    "team member sees own access",
  );
  ok(
    (await as(U.admin, () => q(`select my_admin_access() a`)))[0].a.founder === true,
    "founder access",
  );
  ok(
    (await as(STAFF, () => q(`select count(*)::int c from verification_requests`)))[0].c > 0,
    "verification staff reads requests",
  );
  ok(
    (await as(STAFF, () => q(`select count(*)::int c from subscription_payments`)))[0].c === 0,
    "verification staff can't read payments",
  );
  ok(
    (await as(STAFF, () => q(`select count(*)::int c from bookings`)))[0].c === 0,
    "verification staff can't read bookings",
  );
  ok(
    (await as(STAFF, () => q(`select count(*)::int c from document_access_log`)))[0].c === 0,
    "verification staff can't read access log",
  );
  await expectError(
    as(STAFF, () => q(`select * from admin_weekly_kpis(2)`)),
    "not_authorized",
    "no KPIs without reports",
  );
  await expectError(
    as(STAFF, () => q(`select admin_moderate_listing($1, 'suspend', 'x')`, [P1])),
    "not_authorized",
    "no moderation without listings",
  );
  await expectError(
    as(STAFF, () => q(`select admin_upsert_staff('g@x', 'Ops', array['verification'])`)),
    "not_authorized",
    "team member can't add others",
  );
  await expectError(
    as(STAFF, () => q(`select * from admin_list_staff()`)),
    "not_authorized",
    "team list founder-only",
  );
  await as(U.admin, () =>
    q(`select admin_upsert_staff('staff@x', 'Ops', array['verification','listings','reports'])`),
  );
  ok(
    (await as(STAFF, () => q(`select * from admin_weekly_kpis(2)`))).length === 2,
    "reports permission unlocks KPIs",
  );
  await as(STAFF, () => q(`select admin_moderate_listing($1, 'restore')`, [P1]));
  ok(
    (await q(`select status from properties where id=$1`, [P1]))[0].status === "draft",
    "listings staff lifts suspension via RPC",
  );
  await as(STAFF, () => q(`select admin_moderate_listing($1, 'suspend', 'fake photos')`, [P1]));
  ok(
    (await q(`select status from properties where id=$1`, [P1]))[0].status === "suspended",
    "listings staff suspends via RPC",
  );
  await expectError(
    as(STAFF, () => q(`select admin_moderate_listing($1, 'suspend', '')`, [P1])),
    "reason_required",
    "suspend needs a reason",
  );
  await as(U.admin, () => q(`select admin_set_staff_active($1, false)`, [STAFF]));
  ok(
    (await as(STAFF, () => q(`select my_admin_access() a`)))[0].a === null,
    "deactivated member loses access",
  );
  ok(
    (await as(STAFF, () => q(`select count(*)::int c from verification_requests`)))[0].c === 0,
    "deactivated member can't read requests",
  );
  ok(
    (await q(`select count(*)::int c from staff_members`))[0].c === 1,
    "deactivation keeps the row (no hard delete)",
  );
  ok(
    (await as(U.admin, () => q(`select * from admin_list_staff()`)))[0].email === "Staff@x",
    "founder lists team with emails",
  );

  console.log("\n== 0020 signup phone + terms ==");
  await exec(fs.readFileSync(path.join(MIG, "0020_signup_phone_and_terms.sql"), "utf8"), "0020");
  const P = {
    eg: "c0000000-0000-0000-0000-000000000001",
    intl: "c0000000-0000-0000-0000-000000000002",
    bad: "c0000000-0000-0000-0000-000000000003",
    plus20: "c0000000-0000-0000-0000-000000000004",
  };
  await exec(
    `insert into auth.users (id, email, raw_user_meta_data) values
     ('${P.eg}', 'p1@x', '{"full_name":"Host","role":"owner","phone":" 010 1234-5678","terms_version":"t1","terms_accepted_at":"2026-11-18T10:00:00Z"}'),
     ('${P.intl}', 'p2@x', '{"full_name":"Tourist","phone":"+447700900123"}'),
     ('${P.bad}', 'p3@x', '{"full_name":"Typo","phone":"abc123","terms_accepted_at":"not-a-date","terms_version":"t1"}'),
     ('${P.plus20}', 'p4@x', '{"full_name":"Plus","phone":"+201112223334"}');`,
    "0020 signups",
  );
  rows = await q(
    `select id, phone, role::text as role, terms_version, terms_accepted_at from profiles where id in ('${P.eg}','${P.intl}','${P.bad}','${P.plus20}')`,
  );
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));
  ok(
    byId[P.eg].phone === "01012345678" && byId[P.eg].role === "owner",
    "Egyptian number normalized",
  );
  ok(
    byId[P.eg].terms_version === "t1" && byId[P.eg].terms_accepted_at !== null,
    "terms acceptance recorded",
  );
  ok(byId[P.intl].phone === "+447700900123", "international number kept");
  ok(byId[P.plus20].phone === "01112223334", "+20 number normalized to 01…");
  ok(
    byId[P.bad].phone === null && byId[P.bad].terms_accepted_at !== null,
    "invalid phone/date don't break signup",
  );
  ok(
    (await q(`select listing_blockers(gen_random_uuid(), '${P.bad}', 100) b`))[0].b.includes(
      "missing_phone",
    ),
    "owner without phone gets missing_phone blocker",
  );
  ok(
    !(await q(`select listing_blockers(gen_random_uuid(), '${P.eg}', 100) b`))[0].b.includes(
      "missing_phone",
    ),
    "owner with phone has no missing_phone blocker",
  );
  await expectError(
    as(U.owner, () => q(`select listing_blockers(gen_random_uuid(), '${U.owner}', 100)`)),
    "permission denied",
    "listing_blockers stays locked for clients",
  );

  console.log("\n== Down migration, then up again ==");
  await exec(
    fs.readFileSync(path.join(MIG, "down", "0020_signup_phone_and_terms.down.sql"), "utf8"),
    "down 0020",
  );
  ok(
    !(await q(`select listing_blockers(gen_random_uuid(), '${P.bad}', 100) b`))[0].b.includes(
      "missing_phone",
    ),
    "after 0020 down, publish rules are back to 0018",
  );
  await exec(
    fs.readFileSync(path.join(MIG, "down", "0019_staff_roles.down.sql"), "utf8"),
    "down 0019",
  );
  ok(
    (await as(U.admin, () => q(`select * from admin_weekly_kpis(2)`))).length === 2,
    "after 0019 down, founder KPIs still work",
  );
  await exec(
    fs.readFileSync(path.join(MIG, "down", "0018_business_alignment.down.sql"), "utf8"),
    "down",
  );
  rows = await q(
    `select title, status, (select slug from compounds c where c.id = compound_id) slug from properties where title in ('تاتا','يمنبمنيستلهم','Chalet Zaha') order by title`,
  );
  ok(
    rows.every((r) => r.status === "published") &&
      rows.filter((r) => r.title !== "Chalet Zaha").every((r) => r.slug === "property"),
    "down restores statuses + compounds",
  );
  await exec(
    fs.readFileSync(path.join(MIG, "0018_business_alignment.sql"), "utf8"),
    "0018 re-apply",
  );
  ok(true, "0018 re-applies cleanly after down");
  await exec(fs.readFileSync(path.join(MIG, "0019_staff_roles.sql"), "utf8"), "0019 re-apply");
  ok(true, "0019 re-applies cleanly after down");
  await exec(
    fs.readFileSync(path.join(MIG, "0020_signup_phone_and_terms.sql"), "utf8"),
    "0020 re-apply",
  );
  ok(true, "0020 re-applies cleanly after down");
} catch (e) {
  console.log("UNHANDLED:", e.message, "|", e.where);
  failures++;
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
