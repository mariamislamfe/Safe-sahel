"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { adminDict } from "@/lib/i18n/admin";
import { errorText } from "@/lib/i18n/common";

/** Run an admin action, surface DB errors, refresh the server page. */
function useAction() {
  const router = useRouter();
  const locale = useLocale();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => PromiseLike<{ error: { message: string } | null }>) {
    setBusy(true);
    setError(null);
    const { error: e } = await fn();
    setBusy(false);
    if (e) setError(errorText(locale, rpcErrorCode(e.message)) + ` (${e.message})`);
    else router.refresh();
  }
  return { busy, error, run, locale };
}

const primary =
  "rounded-md bg-turquoise px-md py-xs text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60";
const ghost =
  "rounded-md border border-border px-md py-xs text-sm font-medium text-ink-secondary hover:border-red-300 hover:text-red-600 disabled:opacity-60";
const Err = ({ e }: { e: string | null }) =>
  e ? <p className="text-xs text-red-600">{e}</p> : null;

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
          className="rounded-sm border border-border bg-surface px-sm py-xs text-sm text-ink"
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
          className={primary}
        >
          ✓ {t.approve}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            const reason = prompt(t.rejectReason);
            if (reason)
              run(() =>
                supabase.rpc("review_verification", {
                  p_request_id: requestId,
                  p_approve: false,
                  p_reason: reason,
                }),
              );
          }}
          className={ghost}
        >
          {t.reject}
        </button>
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
      <div className="flex gap-sm">
        <button
          disabled={busy}
          onClick={() =>
            run(() => supabase.rpc("review_broker_authorization", { p_id: id, p_approve: true }))
          }
          className={primary}
        >
          ✓ {t.approve}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            const reason = prompt(t.rejectReason);
            if (reason)
              run(() =>
                supabase.rpc("review_broker_authorization", {
                  p_id: id,
                  p_approve: false,
                  p_reason: reason,
                }),
              );
          }}
          className={ghost}
        >
          {t.reject}
        </button>
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
          className={primary}
        >
          ✓ {t.approve}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            const reason = prompt(t.rejectReason);
            if (reason)
              run(() => supabase.rpc("reject_payment", { p_payment_id: id, p_reason: reason }));
          }}
          className={ghost}
        >
          {t.reject}
        </button>
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
  const small =
    "rounded px-sm py-0.5 text-xs font-medium border border-border hover:border-turquoise disabled:opacity-60";
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex flex-wrap gap-xs">
        {status === "published" && (
          <button
            disabled={busy}
            className={small}
            onClick={() => {
              const reason = prompt(t.reasonPrompt);
              if (reason !== null)
                run(() =>
                  supabase
                    .from("properties")
                    .update({ status: "draft", unpublished_reason: reason || "admin" })
                    .eq("id", propertyId),
                );
            }}
          >
            {t.unpublish}
          </button>
        )}
        {status !== "suspended" ? (
          <button
            disabled={busy}
            className={`${small} text-red-700`}
            onClick={() => {
              const reason = prompt(t.reasonPrompt);
              if (reason)
                run(() =>
                  supabase
                    .from("properties")
                    .update({ status: "suspended", unpublished_reason: reason })
                    .eq("id", propertyId),
                );
            }}
          >
            {t.suspend}
          </button>
        ) : (
          <button
            disabled={busy}
            className={small}
            onClick={() =>
              run(() =>
                supabase
                  .from("properties")
                  .update({ status: "draft", unpublished_reason: null })
                  .eq("id", propertyId),
              )
            }
          >
            {t.restore}
          </button>
        )}
        {flagged && (
          <button
            disabled={busy}
            className={small}
            onClick={() =>
              run(() =>
                supabase
                  .from("properties")
                  .update({ flagged_for_review: false, flag_reason: null })
                  .eq("id", propertyId),
              )
            }
          >
            {t.clearFlag}
          </button>
        )}
        {ownerVerified && (
          <button
            disabled={busy}
            className={`${small} text-red-700`}
            onClick={() => {
              const reason = prompt(t.revokePrompt);
              if (reason)
                run(() =>
                  supabase.rpc("revoke_verification", { p_profile_id: ownerId, p_reason: reason }),
                );
            }}
          >
            {t.revokeBadge}
          </button>
        )}
      </div>
      <Err e={error} />
    </div>
  );
}

export function DuplicateFlagActions({ id }: { id: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].listings;
  const supabase = createClient();
  const set = (status: "dismissed" | "confirmed") =>
    run(() =>
      supabase
        .from("listing_duplicate_flags")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", id),
    );
  return (
    <div className="flex flex-wrap gap-xs">
      <button
        disabled={busy}
        onClick={() => set("dismissed")}
        className="rounded border border-border px-sm py-0.5 text-xs"
      >
        {t.dismiss}
      </button>
      <button
        disabled={busy}
        onClick={() => set("confirmed")}
        className="rounded border border-red-300 px-sm py-0.5 text-xs text-red-700"
      >
        {t.confirmDup}
      </button>
      <Err e={error} />
    </div>
  );
}

export function RevokeStrike({ id }: { id: string }) {
  const { busy, error, run, locale } = useAction();
  const t = adminDict[locale].listings;
  const supabase = createClient();
  return (
    <span>
      <button
        disabled={busy}
        onClick={() => {
          const reason = prompt(t.reasonPrompt);
          if (reason)
            run(() =>
              supabase
                .from("owner_strikes")
                .update({ revoked_at: new Date().toISOString(), revoke_reason: reason })
                .eq("id", id),
            );
        }}
        className="text-xs text-turquoise-dark underline"
      >
        {t.revokeStrike}
      </button>
      <Err e={error} />
    </span>
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
        className={primary}
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
    <span>
      <button
        disabled={busy}
        onClick={() =>
          run(() =>
            createClient()
              .from("featured_slots")
              .update({ cancelled_at: new Date().toISOString() })
              .eq("id", slotId),
          )
        }
        className="text-xs text-red-600 underline"
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
          className="rounded-sm border border-border bg-surface px-sm py-0.5 text-xs"
        >
          <option value="">{t.pickListing}</option>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={90}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-14 rounded-sm border border-border bg-surface px-xs py-0.5 text-xs"
          aria-label={t.days}
        />
        <button
          disabled={busy || !id}
          onClick={() =>
            run(() =>
              createClient().rpc("admin_grant_featured", { p_property_id: id, p_days: days }),
            )
          }
          className="rounded bg-ink px-sm py-0.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {t.grant}
        </button>
      </div>
      <Err e={error} />
    </div>
  );
}
