"use client";

import { useState } from "react";
import type { DocumentKindEnum } from "@safe-sahel/types";
import { useLocale } from "@/lib/i18n/locale-provider";
import { common, errorText } from "@/lib/i18n/common";

/** Opens a private ID/document through the logged, 60-second signed-URL route. */
export function DocumentViewButton({
  kind,
  id,
  label,
  className,
}: {
  kind: DocumentKindEnum;
  id: string;
  label?: string;
  className?: string;
}) {
  const locale = useLocale();
  const t = common[locale];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    // Open the tab synchronously (popup blockers), then point it at the URL.
    const tab = window.open("", "_blank");
    const res = await fetch("/api/documents/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id }),
    });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    setBusy(false);
    if (!res.ok || !json.url) {
      tab?.close();
      setError(errorText(locale, json.error));
      return;
    }
    if (tab) tab.location.href = json.url;
    else window.location.href = json.url;
  }

  return (
    <span className="inline-flex flex-col gap-0.5">
      <button
        type="button"
        onClick={open}
        disabled={busy}
        title={t.documentNote}
        className={
          className ??
          "inline-flex items-center gap-xs rounded-md border border-border px-md py-xs text-sm font-medium text-ink hover:border-turquoise disabled:opacity-60"
        }
      >
        🔒 {busy ? t.openingDocument : (label ?? t.viewDocument)}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
