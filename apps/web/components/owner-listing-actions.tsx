"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { parsePublishBlockers, rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { blockerTexts, errorText } from "@/lib/i18n/common";

/** Publish / unpublish / archive (soft delete). The DB enforces the publish rules. */
export function OwnerListingActions({
  propertyId,
  status,
  canPublish,
}: {
  propertyId: string;
  status: string;
  canPublish: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].listings;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function update(patch: { status?: "draft" | "published"; deleted_at?: string }) {
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().from("properties").update(patch).eq("id", propertyId);
    setBusy(false);
    if (e) {
      const blockers = parsePublishBlockers(e.message);
      setError(
        blockers.length
          ? blockerTexts(locale, blockers).join(" · ")
          : errorText(locale, rpcErrorCode(e.message)),
      );
      return;
    }
    router.refresh();
  }

  const btn = "rounded-md px-md py-xs text-sm font-medium disabled:opacity-60";
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap gap-xs">
        {status === "published" ? (
          <button
            onClick={() => update({ status: "draft" })}
            disabled={busy}
            className={`${btn} border border-border hover:border-turquoise`}
          >
            {t.unpublish}
          </button>
        ) : status !== "suspended" ? (
          <button
            onClick={() => update({ status: "published" })}
            disabled={busy || !canPublish}
            className={`${btn} bg-turquoise text-white hover:bg-turquoise-dark`}
          >
            {busy ? t.publishing : t.publish}
          </button>
        ) : null}
        <button
          onClick={() =>
            confirm(t.archiveConfirm) &&
            update({ deleted_at: new Date().toISOString(), status: "draft" })
          }
          disabled={busy}
          className={`${btn} text-ink-secondary hover:text-red-600`}
        >
          {t.archive}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
