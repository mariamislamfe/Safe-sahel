import { cookies } from "next/headers";
import type { Locale } from "@safe-sahel/types";
import { LOCALE_COOKIE } from "./locale-constants";

/**
 * Minimal locale plumbing for Phase 0 — proves the RTL path works end to
 * end (cookie → server-rendered `dir` attribute → Arabic font) without
 * building full i18n routing yet. A real locale-routing solution
 * (e.g. `[locale]` segments) is a Phase 9 concern per the roadmap.
 */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "ar" ? "ar" : "en";
}

export { LOCALE_COOKIE };
