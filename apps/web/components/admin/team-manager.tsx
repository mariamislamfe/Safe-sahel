"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFeedback } from "@/components/feedback";
import { ADMIN_PERMISSIONS, type AdminPermission, type StaffListRow } from "@safe-sahel/types";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { adminShellDict, ROLE_PRESETS } from "@/lib/i18n/admin-shell";
import { errorText } from "@/lib/i18n/common";
import { btn } from "@/components/admin-actions";

const input =
  "w-full rounded-lg border border-border bg-surface px-md py-2 text-sm outline-none focus:border-turquoise disabled:bg-surface-soft";

function presetFor(perms: AdminPermission[]): string {
  const key = Object.entries(ROLE_PRESETS).find(
    ([, p]) => p.length === perms.length && p.every((x) => perms.includes(x)),
  )?.[0];
  return key ?? "custom";
}

/** Add/edit form. With `member` it edits that person (email locked). */
export function TeamMemberForm({ member, onDone }: { member?: StaffListRow; onDone?: () => void }) {
  const router = useRouter();
  const locale = useLocale();
  const t = adminShellDict[locale];
  const [email, setEmail] = useState(member?.email ?? "");
  const [title, setTitle] = useState(member?.title ?? "");
  const [perms, setPerms] = useState<AdminPermission[]>(member?.permissions ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const preset = presetFor(perms);

  function applyPreset(key: string) {
    if (key === "custom") return;
    setPerms(ROLE_PRESETS[key] ?? []);
    if (!title.trim()) setTitle(t.presets[key] ?? "");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error: err } = await createClient().rpc("admin_upsert_staff", {
      p_email: email.trim(),
      p_title: title.trim(),
      p_permissions: perms,
    });
    setBusy(false);
    if (err) return setError(errorText(locale, rpcErrorCode(err.message)));
    setSaved(true);
    if (!member) {
      setEmail("");
      setTitle("");
      setPerms([]);
    }
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-lg">
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium">{t.team.email}</span>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            disabled={!!member}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
          />
          {!member && <span className="text-xs text-ink-secondary">{t.team.emailHint}</span>}
        </label>
        <label className="flex flex-col gap-xs">
          <span className="text-sm font-medium">{t.team.jobTitle}</span>
          <input
            required
            value={title}
            placeholder={t.team.jobTitlePlaceholder}
            onChange={(e) => setTitle(e.target.value)}
            className={input}
          />
        </label>
      </div>

      <div className="flex flex-col gap-sm">
        <span className="text-sm font-medium">{t.team.role}</span>
        <div className="flex flex-wrap gap-xs">
          {[...Object.keys(ROLE_PRESETS), "custom"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => applyPreset(key)}
              className={`rounded-full border px-md py-1.5 text-sm font-medium transition ${
                preset === key
                  ? "border-turquoise bg-turquoise-light text-turquoise-dark"
                  : "border-border text-ink-secondary hover:border-ink-secondary"
              }`}
            >
              {key === "custom" ? t.team.custom : t.presets[key]}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="flex flex-col gap-sm">
        <legend className="mb-sm text-sm font-medium">{t.team.access}</legend>
        <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
          {ADMIN_PERMISSIONS.map((p) => {
            const on = perms.includes(p);
            return (
              <label
                key={p}
                className={`flex cursor-pointer items-start gap-sm rounded-xl border p-md transition ${
                  on
                    ? "border-turquoise bg-turquoise-light/50"
                    : "border-border hover:border-ink-secondary"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setPerms((cur) => (on ? cur.filter((x) => x !== p) : [...cur, p]))
                  }
                  className="mt-0.5 size-4 accent-[#18B7B0]"
                />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{t.permissions[p].label}</span>
                  <span className="text-xs text-ink-secondary">{t.permissions[p].body}</span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="text-xs text-ink-secondary">🔒 {t.team.founderOnly}</p>
      </fieldset>

      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
      {saved && !member && <p className="text-sm text-turquoise-dark">✓ {t.team.added}</p>}
      <div className="flex flex-wrap gap-sm">
        <button
          disabled={busy || !email.trim() || !title.trim() || perms.length === 0}
          className={btn.primary}
        >
          {busy ? t.team.saving : member ? t.team.save : `+ ${t.team.add}`}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className={btn.secondary}>
            {t.team.cancel}
          </button>
        )}
      </div>
    </form>
  );
}

export function TeamMemberRow({ member }: { member: StaffListRow }) {
  const router = useRouter();
  const locale = useLocale();
  const t = adminShellDict[locale];
  const fb = useFeedback();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function setActive(active: boolean) {
    if (!active && !(await fb.confirm({ title: t.team.removeConfirm, tone: "danger" }))) return;
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().rpc("admin_set_staff_active", {
      p_profile_id: member.profile_id,
      p_active: active,
    });
    setBusy(false);
    if (err) return setError(errorText(locale, rpcErrorCode(err.message)));
    router.refresh();
  }

  return (
    <li
      className={`flex flex-col gap-md rounded-2xl border border-border bg-surface p-lg shadow-[0_1px_2px_rgba(16,24,40,0.04)] ${member.active ? "" : "opacity-60"}`}
    >
      <div className="flex flex-col gap-sm sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-sm">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-white">
            {(member.full_name ?? member.email ?? "?").trim().charAt(0).toUpperCase()}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-xs">
              <span className="font-semibold">{member.full_name ?? "—"}</span>
              <span className="rounded-full bg-surface-soft px-sm py-0.5 text-xs font-medium">
                {member.title}
              </span>
              <span
                className={`rounded-full px-sm py-0.5 text-xs font-semibold ${member.active ? "bg-turquoise-light text-turquoise-dark" : "bg-surface-soft text-ink-secondary"}`}
              >
                {member.active ? t.team.active : t.team.inactive}
              </span>
            </span>
            <span className="truncate text-sm text-ink-secondary" dir="ltr">
              {member.email}
            </span>
          </div>
        </div>
        {!editing && (
          <div className="flex shrink-0 gap-xs">
            {member.active && (
              <button onClick={() => setEditing(true)} className={btn.small} disabled={busy}>
                {t.team.edit}
              </button>
            )}
            <button
              onClick={() => setActive(!member.active)}
              className={member.active ? btn.smallDanger : btn.small}
              disabled={busy}
            >
              {member.active ? t.team.remove : t.team.restore}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="border-t border-border pt-md">
          <TeamMemberForm member={member} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <div className="flex flex-wrap gap-xs">
          {member.permissions.map((p) => (
            <span
              key={p}
              className="rounded-md bg-turquoise-light px-sm py-0.5 text-xs font-medium text-turquoise-dark"
            >
              {t.permissions[p]?.label ?? p}
            </span>
          ))}
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </li>
  );
}
