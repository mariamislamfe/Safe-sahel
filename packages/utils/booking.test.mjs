// Run with: pnpm --filter @safe-sahel/utils test   (Node ≥ 22.6, no extra deps)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  toWhatsAppNumber,
  whatsAppUrl,
  bookingWhatsAppMessage,
  countdownTo,
  daysSince,
  parsePublishBlockers,
  rpcErrorCode,
  cairoMonthRange,
  percentChange,
  safeStorageName,
} from "./booking.ts";

test("toWhatsAppNumber normalises Egyptian numbers", () => {
  assert.equal(toWhatsAppNumber("01012345678"), "201012345678");
  assert.equal(toWhatsAppNumber("+20 101 234 5678"), "201012345678");
  assert.equal(toWhatsAppNumber("1012345678"), "201012345678");
});

test("whatsAppUrl encodes the prefilled message", () => {
  const url = whatsAppUrl("01012345678", "حجز SS-ABC123");
  assert.ok(url.startsWith("https://wa.me/201012345678?text="));
  assert.ok(decodeURIComponent(url.split("text=")[1]).includes("SS-ABC123"));
});

test("booking message mentions reference and Safe Sahel in both languages", () => {
  const msg = bookingWhatsAppMessage({
    reference: "SS-ABC123",
    propertyTitle: "Chalet",
    checkIn: "2027-07-01",
    checkOut: "2027-07-04",
    guestName: "Mona",
  });
  assert.match(msg, /SS-ABC123/);
  assert.match(msg, /Safe Sahel/);
  assert.match(msg, /جاي من Safe Sahel/);
  assert.match(msg, /Mona/);
});

test("countdownTo", () => {
  const now = new Date("2027-01-01T10:00:00Z");
  assert.deepEqual(countdownTo("2027-01-02T09:30:00Z", now), {
    expired: false,
    hours: 23,
    minutes: 30,
    totalMinutes: 1410,
  });
  assert.equal(countdownTo("2027-01-01T09:00:00Z", now).expired, true);
  assert.equal(countdownTo("garbage", now).expired, true);
});

test("daysSince", () => {
  const now = new Date("2027-01-10T00:00:00Z");
  assert.equal(daysSince("2027-01-03T00:00:00Z", now), 7);
  assert.equal(daysSince(null, now), null);
  assert.equal(daysSince("2027-02-01T00:00:00Z", now), 0);
});

test("parsePublishBlockers + rpcErrorCode", () => {
  assert.deepEqual(parsePublishBlockers("listing_not_publishable:min_photos,owner_not_verified"), [
    "min_photos",
    "owner_not_verified",
  ]);
  assert.deepEqual(parsePublishBlockers("something else"), []);
  assert.equal(rpcErrorCode("dates_unavailable"), "dates_unavailable");
  assert.equal(rpcErrorCode("listing_not_publishable:min_photos"), "listing_not_publishable");
  assert.equal(
    rpcErrorCode('new row violates row-level security policy for table "x"'),
    "not_authorized",
  );
  assert.equal(
    rpcErrorCode(
      'duplicate key value violates unique constraint "properties_unique_unit_per_compound"',
    ),
    "duplicate_unit",
  );
});

test("cairoMonthRange handles UTC+2 and DST (UTC+3)", () => {
  const jan = cairoMonthRange(new Date("2027-01-15T12:00:00Z"));
  assert.equal(jan.from.toISOString(), "2026-12-31T22:00:00.000Z");
  assert.equal(jan.to.toISOString(), "2027-01-31T22:00:00.000Z");
  // A late-night UTC instant that is already the 1st in Cairo.
  const edge = cairoMonthRange(new Date("2027-01-31T23:30:00Z"));
  assert.equal(edge.from.toISOString(), "2027-01-31T22:00:00.000Z");
  const prev = cairoMonthRange(new Date("2027-01-15T12:00:00Z"), -1);
  assert.equal(prev.to.toISOString(), jan.from.toISOString());
});

test("percentChange", () => {
  assert.equal(percentChange(12, 10), 20);
  assert.equal(percentChange(5, 10), -50);
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(3, 0), null);
});

test("safeStorageName never leaks the original filename", () => {
  assert.equal(safeStorageName("Ahmed National ID.JPG", "abc"), "abc.jpg");
  assert.equal(safeStorageName("noext", "abc"), "abc");
  assert.equal(safeStorageName("weird.<script>", "abc"), "abc");
});
