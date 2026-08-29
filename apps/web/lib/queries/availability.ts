import { createClient } from "@/lib/supabase/server";

export type DateRange = { start: string; end: string };

/** Postgres returns `daterange` as e.g. `["2026-09-01","2026-09-05")` — pull the two ISO dates out. */
function parseDateRange(raw: string): DateRange | null {
  const match = raw.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return { start: match[1]!, end: match[2]! };
}

export async function getPropertyUnavailableRanges(propertyId: string): Promise<DateRange[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_blocks")
    .select("range")
    .eq("property_id", propertyId);

  return (data ?? [])
    .map((row) => parseDateRange(row.range))
    .filter((r): r is DateRange => r !== null);
}

export async function getDepositPercentage(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "deposit_percentage")
    .maybeSingle();
  return typeof data?.value === "number" ? data.value : 20;
}

export async function getSubscriptionPriceEgp(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "owner_subscription_price_egp")
    .maybeSingle();
  return typeof data?.value === "number" ? data.value : 500;
}
