"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { checkFile, uploadPrivate } from "@/lib/upload";
import { ConsentCheckbox, CONSENT_VERSION } from "@/components/consent-checkbox";
import { useLocale } from "@/lib/i18n/locale-provider";
import { ownerDict } from "@/lib/i18n/owner";
import { common, errorText } from "@/lib/i18n/common";

export function BrokerAuthorizationForm({
  propertyId,
  brokerId,
}: {
  propertyId: string;
  brokerId: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].authorization;
  const c = common[locale];
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError(c.consentRequired);
    if (!file || !ownerName.trim()) return setError(c.errors.generic!);
    const check = checkFile(file);
    if (check !== "ok")
      return setError(check === "too_large" ? c.fileTooLarge : c.fileTypeNotAllowed);

    setBusy(true);
    const { path, error: uploadError } = await uploadPrivate(
      "verification-documents",
      [brokerId, "authorizations", propertyId],
      file,
    );
    if (uploadError) {
      setBusy(false);
      return setError(errorText(locale, rpcErrorCode(uploadError.message)));
    }
    const { error: insertError } = await createClient()
      .from("broker_authorizations")
      .insert({
        property_id: propertyId,
        broker_id: brokerId,
        document_path: path,
        owner_full_name: ownerName.trim(),
        owner_phone: ownerPhone.trim() || null,
        consent_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      });
    setBusy(false);
    if (insertError) return setError(errorText(locale, rpcErrorCode(insertError.message)));
    setOwnerName("");
    setOwnerPhone("");
    setFile(null);
    router.refresh();
  }

  const input =
    "rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise";
  return (
    <form onSubmit={submit} className="flex flex-col gap-md">
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.ownerName}</span>
        <input
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          required
          className={input}
        />
      </label>
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.ownerPhone}</span>
        <input
          type="tel"
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">📄 {t.doc}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          required
          className="text-sm text-ink-secondary"
        />
      </label>
      <ConsentCheckbox checked={consent} onChange={setConsent} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        disabled={busy}
        className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {busy ? c.submitting : t.submit}
      </button>
    </form>
  );
}
