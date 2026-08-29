"use client";

import { useState } from "react";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";

const WHATSAPP_NUMBER = "201123094983";

export function SubscriptionGate({
  propertyId,
  priceEgp,
  onActivated,
}: {
  propertyId: string;
  priceEgp: number;
  onActivated: () => void;
}) {
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function redeemCode() {
    if (!code.trim()) return;
    setRedeeming(true);
    setError(null);
    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc("redeem_subscription_code", {
      p_property_id: propertyId,
      p_code: code.trim(),
    });

    setRedeeming(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    if (!data) {
      setError("That code isn't valid or has already been used.");
      return;
    }
    onActivated();
  }

  return (
    <div className="flex flex-col gap-lg rounded-xl border border-turquoise bg-turquoise-light p-lg">
      <div className="flex flex-col gap-xs">
        <p className="font-display text-lg font-semibold text-ink">Activate this listing</p>
        <p className="text-sm text-ink-secondary">
          Publishing a property costs {formatEgp(priceEgp)} / month.
        </p>
      </div>

      <div className="flex flex-col gap-sm rounded-lg bg-surface p-md">
        <p className="text-sm font-medium text-ink">Option 1 — Pay online</p>
        <button
          disabled
          className="w-fit cursor-not-allowed rounded-md bg-surface-soft px-lg py-sm text-sm font-medium text-ink-secondary ring-1 ring-inset ring-border"
        >
          Coming soon
        </button>
      </div>

      <div className="flex flex-col gap-sm rounded-lg bg-surface p-md">
        <p className="text-sm font-medium text-ink">
          Option 2 — Pay via WhatsApp, then enter your code
        </p>
        <p className="text-sm text-ink-secondary">
          Message us on{" "}
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-turquoise-dark hover:underline"
          >
            +{WHATSAPP_NUMBER}
          </a>{" "}
          to pay and ask about our subscription — we&apos;ll send you an activation code.
        </p>
        <div className="flex gap-sm">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Activation code"
            className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
          />
          <button
            onClick={redeemCode}
            disabled={redeeming}
            className="rounded-md bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
          >
            {redeeming ? "Activating…" : "Activate"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
