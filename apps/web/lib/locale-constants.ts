// Split from lib/locale.ts so Client Components (e.g. locale-toggle.tsx) can
// import the cookie name without pulling in next/headers, which only works
// in Server Components.
export const LOCALE_COOKIE = "safesahel-locale";
