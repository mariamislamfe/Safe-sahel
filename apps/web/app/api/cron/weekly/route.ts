import { NextResponse, type NextRequest } from "next/server";
import { authorizeCron } from "@/lib/cron";
import { flushNotificationOutbox } from "@/lib/notify";

export const dynamic = "force-dynamic";

/** Weekly "راجع الكالندر بتاعك" reminder to every owner with a live listing. */
export async function GET(request: NextRequest) {
  const auth = authorizeCron(request);
  if (auth.error) return auth.error;

  const { data: queued, error } = await auth.admin.rpc("enqueue_calendar_reminders");
  const email = await flushNotificationOutbox(auth.admin);
  return NextResponse.json({ queued, error: error?.message ?? null, email });
}
