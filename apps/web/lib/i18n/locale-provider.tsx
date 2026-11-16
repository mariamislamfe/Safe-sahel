"use client";

import { createContext, useContext } from "react";
import type { Locale } from "@safe-sahel/types";

const LocaleContext = createContext<Locale>("en");

/** Root layout reads the locale cookie server-side and hands it to every client component. */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
