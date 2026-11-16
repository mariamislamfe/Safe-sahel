"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const SESSION_KEY = "ss_sid";

/** Anonymous per-browser id (no personal data) used only to de-duplicate views. */
function sessionId(): string | null {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function trackEvent(event: "view" | "whatsapp_click" | "site_visit", propertyId?: string) {
  const supabase = createClient();
  void supabase.rpc("track_listing_event", {
    p_event: event,
    p_property_id: propertyId ?? null,
    p_session_id: sessionId(),
  });
}

/** Mounted once in the root layout → weekly KPI "site visits". */
export function SiteVisitTracker() {
  useEffect(() => {
    trackEvent("site_visit");
  }, []);
  return null;
}

/** Mounted on a listing page → owner report "people who saw your chalet". */
export function ListingViewTracker({ propertyId }: { propertyId: string }) {
  useEffect(() => {
    trackEvent("view", propertyId);
  }, [propertyId]);
  return null;
}
