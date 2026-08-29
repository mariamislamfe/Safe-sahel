"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function VerificationForm({
  profileId,
  defaultFullName,
}: {
  profileId: string;
  defaultFullName: string;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(defaultFullName);
  const [phone, setPhone] = useState("");
  const [sahelLocation, setSahelLocation] = useState("");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!idFile) {
      setError("Please attach a photo of your ID.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    const path = `${profileId}/${crypto.randomUUID()}-${idFile.name}`;
    const { error: uploadError } = await supabase.storage
      .from("verification-documents")
      .upload(path, idFile);

    if (uploadError) {
      setError(uploadError.message);
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("verification_requests").insert({
      profile_id: profileId,
      full_name: fullName,
      phone,
      sahel_location: sahelLocation,
      id_document_url: path,
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    router.push("/profile");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-lg">
      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">Full name (as on your ID)</span>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">Phone number</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          placeholder="01xxxxxxxxx"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">Where in Sahel do you have a property?</span>
        <input
          value={sahelLocation}
          onChange={(e) => setSahelLocation(e.target.value)}
          required
          placeholder="e.g. Marassi, chalet in phase 3"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
      </label>

      <label className="flex flex-col gap-xs">
        <span className="text-sm font-medium text-ink">National ID photo</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setIdFile(e.target.files?.[0] ?? null)}
          required
          className="text-sm text-ink-secondary"
        />
        <span className="text-xs text-ink-secondary">
          Kept private — only visible to you and the Safe Sahel team.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-fit rounded-md bg-turquoise px-xl py-md font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit request"}
      </button>
      <p className="text-xs text-ink-secondary">
        After you submit, we&apos;ll contact you soon to complete the verification process.
      </p>
    </form>
  );
}
