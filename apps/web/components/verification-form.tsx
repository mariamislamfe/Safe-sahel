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

/**
 * Owner/broker verification: National ID + proof of ownership (compound card
 * or maintenance bill). Files go to the private bucket under a random name;
 * the DB trigger forces status=pending and requires consent.
 */
export function VerificationForm({
  profileId,
  defaultFullName,
  defaultPhone,
}: {
  profileId: string;
  defaultFullName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = ownerDict[locale].verification;
  const c = common[locale];
  const [kind, setKind] = useState<"owner" | "broker">("owner");
  const [fullName, setFullName] = useState(defaultFullName);
  const [phone, setPhone] = useState(defaultPhone);
  const [location, setLocation] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [proofType, setProofType] = useState<"compound_card" | "maintenance_bill">("compound_card");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return setError(c.consentRequired);
    if (!idFile || (kind === "owner" && !proofFile)) return setError(c.errors.generic!);
    for (const f of [idFile, proofFile].filter(Boolean) as File[]) {
      const check = checkFile(f);
      if (check !== "ok")
        return setError(check === "too_large" ? c.fileTooLarge : c.fileTypeNotAllowed);
    }

    setSubmitting(true);
    const idUpload = await uploadPrivate("verification-documents", [profileId, "id"], idFile);
    if (idUpload.error) {
      setSubmitting(false);
      return setError(errorText(locale, rpcErrorCode(idUpload.error.message)));
    }
    let proofPath: string | null = null;
    if (proofFile) {
      const proofUpload = await uploadPrivate(
        "verification-documents",
        [profileId, "proof"],
        proofFile,
      );
      if (proofUpload.error) {
        setSubmitting(false);
        return setError(errorText(locale, rpcErrorCode(proofUpload.error.message)));
      }
      proofPath = proofUpload.path;
    }

    const { error: insertError } = await createClient()
      .from("verification_requests")
      .insert({
        profile_id: profileId,
        kind,
        full_name: fullName.trim(),
        phone: phone.trim(),
        sahel_location: location.trim() || null,
        id_document_url: idUpload.path,
        ownership_proof_path: proofPath,
        ownership_proof_type: proofFile ? proofType : null,
        consent_at: new Date().toISOString(),
        consent_version: CONSENT_VERSION,
      });
    setSubmitting(false);
    if (insertError) return setError(errorText(locale, rpcErrorCode(insertError.message)));
    router.refresh();
  }

  const input =
    "rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise";

  return (
    <form onSubmit={submit} className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.kind}</span>
        <div className="flex flex-wrap gap-sm">
          {(["owner", "broker"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-full border px-lg py-xs text-sm font-medium ${kind === k ? "border-turquoise bg-turquoise-light text-turquoise-dark" : "border-border text-ink-secondary"}`}
            >
              {k === "owner" ? t.kindOwner : t.kindBroker}
            </button>
          ))}
        </div>
        {kind === "broker" && <p className="text-xs text-ink-secondary">{t.brokerNote}</p>}
      </div>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">{t.fullName}</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className={input}
        />
      </label>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium">{t.phone}</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder="01xxxxxxxxx"
            className={input}
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium">{t.location}</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} className={input} />
        </label>
      </div>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium">🪪 {t.idDoc}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          required
          className="text-sm text-ink-secondary"
        />
      </label>

      <div className="flex flex-col gap-xs">
        <span className="text-sm font-medium">🏠 {t.proofType}</span>
        <div className="flex flex-wrap gap-sm">
          {(["compound_card", "maintenance_bill"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setProofType(p)}
              className={`rounded-full border px-md py-xs text-sm ${proofType === p ? "border-turquoise bg-turquoise-light text-turquoise-dark" : "border-border text-ink-secondary"}`}
            >
              {p === "compound_card" ? t.compoundCard : t.maintenanceBill}
            </button>
          ))}
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
          onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
          required={kind === "owner"}
          className="text-sm text-ink-secondary"
        />
      </div>

      <p className="text-xs text-ink-secondary">🔒 {t.privateNote}</p>
      <ConsentCheckbox checked={consent} onChange={setConsent} />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {submitting ? c.submitting : t.submit}
      </button>
    </form>
  );
}
