"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@safe-sahel/types";
import { LOCALE_COOKIE } from "@/lib/locale-constants";

export function LocaleToggle({
  locale,
  transparent = false,
}: {
  locale: Locale;
  transparent?: boolean;
}) {
  const router = useRouter();

  function toggle() {
    const next: Locale = locale === "ar" ? "en" : "ar";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`;
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      className={`rounded-md border px-md py-sm text-sm font-medium transition-colors ${
        transparent
          ? "border-white/40 bg-transparent text-white hover:border-white hover:text-white"
          : "border-border bg-surface text-ink-secondary hover:border-turquoise hover:text-turquoise-dark"
      }`}
    >
      {locale === "ar" ? "English" : "العربية"}
    </button>
  );
}
