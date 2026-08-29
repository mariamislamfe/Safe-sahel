"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { CurrentProfile } from "@/lib/hooks/use-current-profile";

export function ProfileEditor({ profile }: { profile: CurrentProfile }) {
  const router = useRouter();
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
      setError(
        updateError.message.includes("duplicate")
          ? "That username is already taken."
          : updateError.message,
      );
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function becomeGuestOnly() {
    if (!confirm("Switch back to guest-only? You can enable hosting again anytime.")) return;
    setDemoting(true);
    const supabase = createClient();
    await supabase.from("profiles").update({ role: "guest" }).eq("id", profile.id);
    setDemoting(false);
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
          {uploadingAvatar ? "Uploading…" : "Change photo"}
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
          <span className="text-sm font-medium text-ink">Full name</span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
          />
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">Username</span>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="e.g. sara_sahel"
            className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
          />
          <span className="text-xs text-ink-secondary">Lets other people find your profile.</span>
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium text-ink">Phone number</span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 01123094983"
            className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
          />
          <span className="text-xs text-ink-secondary">
            Shown to the other side once a booking on your account is confirmed, so you can
            coordinate directly.
          </span>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-turquoise-dark">Saved.</p>}

        <button
          onClick={saveProfile}
          disabled={savingProfile}
          className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {savingProfile ? "Saving…" : "Save changes"}
        </button>
      </div>

      {profile.role === "owner" && (
        <div className="border-t border-border pt-lg">
          <button
            onClick={becomeGuestOnly}
            disabled={demoting}
            className="text-sm font-medium text-ink-secondary hover:text-red-600"
          >
            {demoting ? "Switching…" : "Turn off hosting — switch back to guest only"}
          </button>
        </div>
      )}
    </div>
  );
}
