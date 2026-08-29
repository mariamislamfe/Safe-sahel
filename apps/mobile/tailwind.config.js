// Loads the shared TS preset directly — see packages/config/tailwind-preset.ts.
// `ts-node/register` lets Metro's Node process require a .ts file at config
// time without a separate build step, so colors/spacing/radius stay defined
// in exactly one place for both apps.
require("ts-node/register/transpile-only");
const { safeSahelPreset } = require("../../packages/config/tailwind-preset.ts");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [safeSahelPreset, require("nativewind/preset")],
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // Mobile-specific: React Native has no @font-face — each weight is
      // its own font family name, loaded via expo-font in _layout.tsx.
      fontFamily: {
        display: ["PlusJakartaSans_700Bold"],
        body: ["Inter_400Regular"],
        arabic: ["Tajawal_700Bold"],
      },
    },
  },
};
