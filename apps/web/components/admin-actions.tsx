"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { adminDict } from "@/lib/i18n/admin";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { errorText } from "@/lib/i18n/common";

type Result = PromiseLike<{ error: { message: string } | null }>;

/** Run an admin action, surface DB errors, refresh the server page. */
function useAction() {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Result) {
    setBusy(true);
    setError(null);
    const { error: e } = await fn();
    setBusy(false);
    if (e) {
      setError(errorText(locale, rpcErrorCode(e.message)));
      return false;
    }
    router.refresh();
    return true;
  }
  return { busy, error, run, locale };
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-xs rounded-lg bg-turquoise px-md py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-turquoise-dark disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-xs rounded-lg border border-border bg-surface px-md py-2 text-sm font-medium text-ink transition hover:border-ink-secondary disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-xs rounded-lg border border-red-200 bg-surface px-md py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50",
  small:
    "inline-flex items-center gap-1 rounded-md border border-border bg-surface px-sm py-1 text-xs font-medium text-ink transition hover:border-ink-secondary disabled:opacity-50",
  smallDanger:
    "inline-flex items-center gap-1 rounded-md border border-red-200 bg-surface px-sm py-1 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50",
};

const Err = ({ e }: { e: string | null }) =>
  e ? <p className="text-xs font-medium text-red-600">{e}</p> : null;

/**
 * A button that opens an inline reason box (instead of the browser's prompt),
 * then confirms. `required` blocks an empty reason.
 */
function ReasonAction({
  label,
  prompt,
  className,
  required = true,
  onConfirm,
  busy,
}: {
  label: string;
  prompt: string;
  className: string;
  required?: boolean;
  onConfirm: (reason: string) => Promise<boolean>;
  busy: boolean;
}) {
  const locale = useLocale();
  const s = adminShellDict[locale].team;
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open)
    return (
      <button type="button" disabled={busy} onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
    );
  return (
    <div className="flex w-full flex-col gap-xs rounded-lg border border-border bg-surface-soft/60 p-sm">
      <label className="text-xs font-medium text-ink-secondary">{prompt}</label>
      <textarea
        autoFocus
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full rounded-md border border-border bg-surface px-sm py-xs text-sm outline-none focus:border-turquoise"
      />
      <div className="flex gap-xs">
        <button
          type="button"
          disabled={busy || (required && !reason.trim())}
          onClick={async () => {
            if (await onConfirm(reason.trim())) {
              setOpen(false);
              setReason("");
            }
          }}
          className={btn.smallDanger}
        >
          {label}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btn.small}>
          {s.cancel}
        </button>
      </div>
    </div>
  );
}

export function ReviewVerification({
  requestId,
  defaultName,
}: {
  requestId: string;
  defaultName: string;
}) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].verification;
  const [name, setName] = useState(defaultName);
  const supabase = createClient();
  return (
    <div className="flex flex-col gap-sm">
      <label className="flex flex-col gap-xs text-xs font-medium text-ink-secondary">
        {t.legalName}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-lg border border-border bg-surface px-sm py-2 text-sm text-ink outline-none focus:border-turquoise"
        />
      </label>
      <div className="flex flex-wrap gap-sm">
        <button
          disabled={busy || !name.trim()}
          onClick={() =>
            run(() =>
              supabase.rpc("review_verification", {
                p_request_id: requestId,
                p_approve: true,
                p_legal_name: name,
              }),
            )
          }
          className={`${btn.primary} flex-1`}
        >
          ✓ {t.approve}
        </button>
        <ReasonAction
          busy={busy}
          label={t.reject}
          prompt={t.rejectReason}
          className={btn.danger}
          onConfirm={(reason) =>
            run(() =>
              supabase.rpc("review_verification", {
                p_request_id: requestId,
                p_approve: false,
                p_reason: reason,
              }),
            )
          }
        />
      </div>
      <Err e={error} />
    </div>
  );
}

export function ReviewAuthorization({ id }: { id: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].verification;
  const supabase = createClient();
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap gap-sm">
        <button
          disabled={busy}
          onClick={() =>
            run(() => supabase.rpc("review_broker_authorization", { p_id: id, p_approve: true }))
          }
          className={btn.primary}
        >
          ✓ {t.approve}
        </button>
        <ReasonAction
          busy={busy}
          label={t.reject}
          prompt={t.rejectReason}
          className={btn.danger}
          onConfirm={(reason) =>
            run(() =>
              supabase.rpc("review_broker_authorization", {
                p_id: id,
                p_approve: false,
                p_reason: reason,
              }),
            )
          }
        />
      </div>
      <Err e={error} />
    </div>
  );
}

export function ReviewPayment({ id }: { id: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].payments;
  const supabase = createClient();
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap gap-sm">
        <button
          disabled={busy}
          onClick={() => run(() => supabase.rpc("approve_payment", { p_payment_id: id }))}
          className={btn.primary}
        >
          ✓ {t.approve}
        </button>
        <ReasonAction
          busy={busy}
          label={t.reject}
          prompt={t.rejectReason}
          className={btn.danger}
          onConfirm={(reason) =>
            run(() => supabase.rpc("reject_payment", { p_payment_id: id, p_reason: reason }))
          }
        />
      </div>
      <Err e={error} />
    </div>
  );
}

export function ListingAdminActions({
  propertyId,
  ownerId,
  status,
  flagged,
  ownerVerified,
}: {
  propertyId: string;
  ownerId: string;
  status: string;
  flagged: boolean;
  ownerVerified: boolean;
}) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].listings;
  const supabase = createClient();
  const moderate = (action: "unpublish" | "suspend" | "restore" | "clear_flag", reason?: string) =>
    run(() =>
      supabase.rpc("admin_moderate_listing", {
        p_property_id: propertyId,
        p_action: action,
        p_reason: reason ?? null,
      }),
    );
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap gap-xs">
        {status === "published" && (
          <ReasonAction
            busy={busy}
            label={t.unpublish}
            prompt={t.reasonPrompt}
            className={btn.small}
            required={false}
            onConfirm={(reason) => moderate("unpublish", reason)}
          />
        )}
        {status !== "suspended" ? (
          <ReasonAction
            busy={busy}
            label={t.suspend}
            prompt={t.reasonPrompt}
            className={btn.smallDanger}
            onConfirm={(reason) => moderate("suspend", reason)}
          />
        ) : (
          <button disabled={busy} className={btn.small} onClick={() => moderate("restore")}>
            {t.restore}
          </button>
        )}
        {flagged && (
          <button disabled={busy} className={btn.small} onClick={() => moderate("clear_flag")}>
            {t.clearFlag}
          </button>
        )}
        {ownerVerified && (
          <ReasonAction
            busy={busy}
            label={t.revokeBadge}
            prompt={t.revokePrompt}
            className={btn.smallDanger}
            onConfirm={(reason) =>
              run(() =>
                supabase.rpc("revoke_verification", { p_profile_id: ownerId, p_reason: reason }),
              )
            }
          />
        )}
      </div>
      <Err e={error} />
    </div>
  );
}

export function DuplicateFlagActions({ id }: { id: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].listings;
  const set = (status: "dismissed" | "confirmed") =>
    run(() => createClient().rpc("admin_review_duplicate", { p_flag_id: id, p_status: status }));
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap gap-xs">
        <button disabled={busy} onClick={() => set("dismissed")} className={btn.small}>
          {t.dismiss}
        </button>
        <button disabled={busy} onClick={() => set("confirmed")} className={btn.smallDanger}>
          {t.confirmDup}
        </button>
      </div>
      <Err e={error} />
    </div>
  );
}

export function RevokeStrike({ id }: { id: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].listings;
  return (
    <div className="flex flex-col gap-xs">
      <ReasonAction
        busy={busy}
        label={t.revokeStrike}
        prompt={t.reasonPrompt}
        className={btn.small}
        onConfirm={(reason) =>
          run(() =>
            createClient().rpc("admin_revoke_strike", { p_strike_id: id, p_reason: reason }),
          )
        }
      />
      <Err e={error} />
    </div>
  );
}

export function GrantGuarantee({ subscriptionId }: { subscriptionId: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].guarantee;
  return (
    <span className="flex flex-col gap-xs">
      <button
        disabled={busy}
        onClick={() =>
          run(() =>
            createClient().rpc("grant_guarantee_month", { p_subscription_id: subscriptionId }),
          )
        }
        className={btn.primary}
      >
        🎁 {t.grant}
      </button>
      <Err e={error} />
    </span>
  );
}

export function CancelFeatured({ slotId }: { slotId: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].featured;
  return (
    <span className="flex flex-col gap-xs">
      <button
        disabled={busy}
        onClick={() =>
          run(() => createClient().rpc("admin_cancel_featured", { p_slot_id: slotId }))
        }
        className={btn.smallDanger}
      >
        {t.cancel}
      </button>
      <Err e={error} />
    </span>
  );
}

export function GrantFeatured({ listings }: { listings: { id: string; title: string }[] }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].featured;
  const [id, setId] = useState("");
  const [days, setDays] = useState(7);
  if (listings.length === 0) return null;
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap items-center gap-xs">
        <select
          value={id}
          onChange={(e) => setId(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-sm py-1.5 text-sm"
        >
          <option value="">{t.pickListing}</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-ink-secondary">
          <input
            type="number"
            min={1}
            max={90}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="w-16 rounded-md border border-border bg-surface px-sm py-1.5 text-sm text-ink"
          />
          {t.days}
        </label>
        <button
          disabled={busy || !id}
          onClick={() =>
            run(() =>
              createClient().rpc("admin_grant_featured", { p_property_id: id, p_days: days }),
            )
          }
          className={btn.primary}
        >
          {t.grant}
        </button>
      </div>
      <Err e={error} />
    </div>
  );
}
