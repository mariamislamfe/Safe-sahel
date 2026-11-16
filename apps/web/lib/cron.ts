import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Anything else is
 * rejected, so these endpoints can't be triggered by the public.
 */
export function authorizeCron(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      error: NextResponse.json(
        { error: "SUPABASE_SERVICE_ROLE_KEY not configured" },
        { status: 503 },
      ),
    };
  }
  return { admin };
}
