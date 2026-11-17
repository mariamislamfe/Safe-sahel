"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { CurrentProfile } from "@/lib/hooks/use-current-profile";
import { useLocale } from "@/lib/i18n/locale-provider";
import { dashboardDict } from "@/lib/i18n/dashboard";
import { useFeedback } from "@/components/feedback";

export function ProfileEditor({ profile }: { profile: CurrentProfile }) {
  const router = useRouter();
  const locale = useLocale();
  const t = dashboardDict[locale].profile;
  const f = dashboardDict[locale].toasts;
  const fb = useFeedback();
  const [fullName, setFullName] = useState(profile.fullName ?? "");
  const [username, setUsername] = useState(profile.username ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [demoting, setDemoting] = useState(false);

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    setError(null);
    const supabase = createClient();
    const path = `${profile.id}/${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError(uploadError.message);
      setUploadingAvatar(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);

    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", profile.id);
    setAvatarUrl(publicUrl);
    setUploadingAvatar(false);
    router.refresh();
  }

  async function saveProfile() {
    setSavingProfile(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName || null, username: username || null, phone: phone || null })
      .eq("id", profile.id);

    setSavingProfile(false);
    if (updateError) {
      setError(updateError.message.includes("duplicate") ? t.usernameTaken : updateError.message);
      return;
    }
    setSaved(true);
    fb.toast(f.saved);
    router.refresh();
  }

  async function becomeGuestOnly() {
    if (!(await fb.confirm({ title: t.turnOffHosting, body: t.turnOffConfirm, tone: "danger" })))
      return;
    setDemoting(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ role: "guest" }).eq("id", profile.id);
    setDemoting(false);
    fb.toast(f.hostingOff);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-xl">
      <div className="flex items-center gap-lg">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-full border border-border bg-surface-soft">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="" fill className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-xl text-ink-secondary">
              {(fullName || profile.email || "?").charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <label className="cursor-pointer text-sm font-medium text-turquoise-dark hover:underline">
          {uploadingAvatar ? t.uploading : t.changePhoto}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploadingAvatar}
            onChange={(e) => e.target.files?.[0] && uploadAvatar(e.target.files[0])}
          />
        </label>
      </div>

      <div className="flex flex-col gap-md">
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.fullName}</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-xl border border-border bg-surface px-md py-2.5 text-sm outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20"
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.username}</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="sara_sahel"
            className="rounded-xl border border-border bg-surface px-md py-2.5 text-sm outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20"
          />
          <span className="text-xs text-ink-secondary">{t.usernameHint}</span>
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">{t.phone}</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01xxxxxxxxx"
            dir="ltr"
            className="rounded-xl border border-border bg-surface px-md py-2.5 text-sm outline-none transition focus:border-turquoise focus:ring-2 focus:ring-turquoise/20"
          />
          <span className="text-xs text-ink-secondary">{t.phoneHint}</span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm font-medium text-turquoise-dark">{t.saved}</p>}

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="w-fit rounded-xl bg-turquoise px-lg py-2.5 text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {savingProfile ? t.saving : t.save}
        </button>
      </div>

      {profile.role === "owner" && (
        <div className="border-t border-border pt-lg">
          <button
            onClick={becomeGuestOnly}
            disabled={demoting}
            className="text-sm font-medium text-ink-secondary hover:text-red-600"
          >
            {demoting ? t.switching : t.turnOffHosting}
          </button>
        </div>
      )}
    </div>
  );
}
