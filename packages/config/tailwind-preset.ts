import { colors, spacing, radius, fontFamily } from "./tokens";
import type { Config } from "tailwindcss";

/**
 * Shared Tailwind preset — imported by both apps/web and apps/mobile so the
 * two Tailwind configs (Tailwind CSS proper, and NativeWind on top of it)
 * stay derived from one token source instead of drifting apart.
 *
 * Pinned to Tailwind v3 syntax deliberately: NativeWind's stable release
 * targets the v3 JS-config model, and sharing one `presets` array between a
 * DOM app and a React Native app only works if both speak that same model.
 */
export const safeSahelPreset: Pick<Config, "theme"> = {
  theme: {
    extend: {
      colors: {
        turquoise: {
          DEFAULT: colors.turquoise,
          dark: colors.turquoiseDark,
          light: colors.turquoiseLight,
        },
        butter: {
          DEFAULT: colors.butter,
          soft: colors.butterSoft,
        },
        ink: colors.text,
        "ink-secondary": colors.textSecondary,
        surface: colors.background,
        "surface-soft": colors.backgroundSoft,
        border: colors.border,
      },
      spacing,
      borderRadius: radius,
      fontFamily: {
        display: [...fontFamily.display],
        body: [...fontFamily.body],
        arabic: [...fontFamily.arabic],
      },
    },
  },
};

export default safeSahelPreset;
