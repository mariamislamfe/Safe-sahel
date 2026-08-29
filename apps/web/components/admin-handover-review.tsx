"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import type { HandoverDetail } from "@/lib/queries/handover";

export function AdminHandoverReview({
  adminId,
  bookingId,
  depositAmount,
  inventory,
  photos,
}: {
  adminId: string;
  bookingId: string;
  depositAmount: number;
  inventory: HandoverDetail["inventory"];
  photos: HandoverDetail["photos"];
}) {
  const router = useRouter();
  const [deduction, setDeduction] = useState(0);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photoFor = (itemId: string, stage: "check_in" | "check_out") =>
    photos.find((p) => p.inventoryItemId === itemId && p.stage === stage)?.url ?? null;

  const refundAmount = Math.max(0, depositAmount - deduction);

  async function resolve() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();

    const { error: updateError } = await supabase
      .from("booking_handovers")
      .update({
        status: "resolved",
        deduction_amount: deduction,
        deduction_reason: deduction > 0 ? reason || null : null,
        refund_amount: refundAmount,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("booking_id", bookingId);

    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/admin/handovers");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-lg">
      {inventory.map((category) => (
        <div key={category.id} className="flex flex-col gap-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{category.name}</p>
          <div className="flex flex-col gap-sm">
            {category.items.map((item) => {
              const checkInUrl = photoFor(item.id, "check_in");
              const checkOutUrl = photoFor(item.id, "check_out");
              return (
                <div key={item.id} className="flex flex-wrap items-center gap-md rounded-lg border border-border p-sm">
                  <p className="w-40 shrink-0 text-sm font-medium text-ink">
                    {item.name} {item.quantity > 1 && `× ${item.quantity}`}
                  </p>
                  <div className="flex gap-sm">
                    <div className="flex flex-col items-center gap-xs">
                      <span className="text-[10px] text-ink-secondary">Reference</span>
                      <div className="relative size-16 overflow-hidden rounded-md border border-border bg-surface-soft">
                        {item.photoUrl && <Image src={item.photoUrl} alt="" fill sizes="64px" className="object-cover" />}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-xs">
                      <span className="text-[10px] text-ink-secondary">Check-in</span>
                      <div className="relative size-16 overflow-hidden rounded-md border border-border bg-surface-soft">
                        {checkInUrl && <Image src={checkInUrl} alt="" fill sizes="64px" className="object-cover" />}
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-xs">
                      <span className="text-[10px] text-ink-secondary">Check-out</span>
                      <div className="relative size-16 overflow-hidden rounded-md border border-border bg-surface-soft">
                        {checkOutUrl && <Image src={checkOutUrl} alt="" fill sizes="64px" className="object-cover" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-col gap-sm rounded-lg border border-border p-lg">
        <p className="font-display text-sm font-semibold text-ink">Resolve handover</p>
        <p className="text-xs text-ink-secondary">Security deposit held: {formatEgp(depositAmount)}</p>

        <label className="flex flex-col gap-xs">
          <span className="text-xs font-medium text-ink-secondary">Deduction (EGP)</span>
          <input
            type="number"
            min={0}
            max={depositAmount}
            value={deduction}
            onChange={(e) => setDeduction(Math.max(0, Number(e.target.value)))}
            className="w-40 rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise"
          />
        </label>

        {deduction > 0 && (
          <label className="flex flex-col gap-xs">
            <span className="text-xs font-medium text-ink-secondary">Reason (shown to the guest)</span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. 1 towel and the kettle were missing at check-out."
              className="rounded-sm border border-border bg-surface px-md py-sm text-ink outline-none focus:border-turquoise"
            />
          </label>
        )}

        <p className="text-sm font-medium text-ink">Refund to guest: {formatEgp(refundAmount)}</p>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={resolve}
          disabled={submitting}
          className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Resolve"}
        </button>
      </div>
    </div>
  );
}
