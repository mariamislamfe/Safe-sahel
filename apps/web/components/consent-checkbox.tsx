"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale-provider";
import { common } from "@/lib/i18n/common";

/** Bump when the privacy policy's ID-handling section changes materially. */
export const CONSENT_VERSION = "2026-11-privacy-v1";

export function ConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = common[useLocale()];
  return (
    <label className="flex items-start gap-sm rounded-md bg-surface-soft p-md text-sm text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-turquoise"
        required
      />
      <span>
        {t.consentLabel}{" "}
        <Link href="/privacy" target="_blank" className="font-medium text-turquoise-dark underline">
          {t.privacyPolicy}
        </Link>
        .
      </span>
    </label>
  );
}
