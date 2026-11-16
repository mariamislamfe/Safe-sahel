import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { flushNotificationOutbox } from "@/lib/notify";

export const dynamic = "force-dynamic";

/**
 * Daily (see vercel.json):
 *  1. run_daily_maintenance(): expire 24h-old requests, hide listings past
 *     the 7-day grace period, queue 7-day expiry reminders.
 *  2. Purge guest ID files 30 days after check-out (PDPL 151/2020). The file
 *     is deleted from storage; the metadata row is kept with purged_at.
 *  3. Send queued notification emails.
 */
export async function GET(request: NextRequest) {
  const auth = authorizeCron(request);
  if (auth.error) return auth.error;
  const admin = auth.admin;

  const { data: maintenance, error: maintenanceError } = await admin.rpc("run_daily_maintenance");

  const { data: toPurge } = await admin
    .from("booking_guest_ids")
    .select("id, storage_path")
    .is("purged_at", null)
    .lt("purge_after", new Date().toISOString())
    .limit(500);

  let purged = 0;
  const purgeErrors: string[] = [];
  for (const row of toPurge ?? []) {
    if (row.storage_path) {
      const { error } = await admin.storage.from("guest-ids").remove([row.storage_path]);
      if (error) {
        purgeErrors.push(`${row.id}: ${error.message}`);
        continue;
      }
    }
    await admin
      .from("booking_guest_ids")
      .update({ purged_at: new Date().toISOString(), storage_path: null })
      .eq("id", row.id);
    purged++;
  }

  const email = await flushNotificationOutbox(admin);

  return NextResponse.json({
    maintenance,
    maintenanceError: maintenanceError?.message ?? null,
    guestIdsPurged: purged,
    purgeErrors,
    email,
  });
}
