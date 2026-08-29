import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type DateRange = { start: string; end: string };

function parseDateRange(raw: string): DateRange | null {
  const match = raw.match(/(\d{4}-\d{2}-\d{2}).*?(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  return { start: match[1]!, end: match[2]! };
}

export function usePropertyUnavailableRanges(propertyId: string) {
  return useQuery({
    queryKey: ["availability", propertyId],
    enabled: !!propertyId,
    queryFn: async (): Promise<DateRange[]> => {
      const { data } = await supabase
        .from("availability_blocks")
        .select("range")
        .eq("property_id", propertyId);
      return (data ?? [])
        .map((row) => parseDateRange(row.range))
        .filter((r): r is DateRange => r !== null);
    },
  });
}

export function useDepositPercentage() {
  return useQuery({
    queryKey: ["settings", "deposit_percentage"],
    queryFn: async (): Promise<number> => {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "deposit_percentage")
        .maybeSingle();
      return typeof data?.value === "number" ? data.value : 20;
    },
  });
}
