import type { Config } from "tailwindcss";
import { safeSahelPreset } from "@safe-sahel/config/tailwind-preset";

const config: Config = {
  presets: [safeSahelPreset as Config],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: {
    extend: {
      // Web-specific: point at the CSS variables next/font injects in
      // app/layout.tsx, with the shared token's family name as fallback.
      fontFamily: {
        display: ["var(--font-display)", "Plus Jakarta Sans", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "Tajawal", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
