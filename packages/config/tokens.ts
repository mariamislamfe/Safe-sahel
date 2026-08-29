/**
 * Safe Sahel design tokens — single source of truth.
 *
 * Consumed by:
 *  - apps/web/tailwind.config.ts   (Tailwind CSS)
 *  - apps/mobile/tailwind.config.js (NativeWind)
 *
 * Change a value here, not in either app's Tailwind config.
 */

export const colors = {
  turquoise: "#18B7B0",
  turquoiseDark: "#0D8F8A",
  turquoiseLight: "#E8FAF8",
  butter: "#F7E7A8",
  butterSoft: "#FFF8D9",
  text: "#17202A",
  textSecondary: "#667085",
  background: "#FFFFFF",
  backgroundSoft: "#F7FAFA",
  border: "#E6ECEC",
} as const;

// Named spacing scale (kept separate from Tailwind's default numeric scale
// so both can coexist — use as e.g. `p-md`, `gap-lg`).
export const spacing = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  "2xl": "32px",
  "3xl": "48px",
  "4xl": "64px",
  "5xl": "96px",
} as const;

export const radius = {
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  full: "9999px",
} as const;

export const fontFamily = {
  display: ["Plus Jakarta Sans", "system-ui", "sans-serif"],
  body: ["Inter", "system-ui", "sans-serif"],
  arabic: ["Tajawal", "system-ui", "sans-serif"],
} as const;

export const shadow = {
  card: "0 1px 2px rgba(23,32,42,0.04), 0 4px 16px rgba(23,32,42,0.05)",
} as const;

export const tokens = { colors, spacing, radius, fontFamily, shadow } as const;

export default tokens;
