"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import type { HandoverDetail, HandoverPhoto } from "@/lib/queries/handover";
import type { HandoverStageEnum } from "@safe-sahel/types";

type Props = {
  ownerId: string;
  bookingId: string;
  inventory: HandoverDetail["inventory"];
  initialPhotos: HandoverPhoto[];
  initialStatus: HandoverDetail["status"];
};

export function HandoverChecklist({
  ownerId,
  bookingId,
  inventory,
  initialPhotos,
  initialStatus,
}: Props) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [status, setStatus] = useState(initialStatus);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const activeStage: HandoverStageEnum | null =
    status === "pending" ? "check_in" : status === "check_in_done" ? "check_out" : null;

  const allItems = useMemo(() => inventory.flatMap((c) => c.items), [inventory]);

  const photoFor = (itemId: string, stage: HandoverStageEnum) =>
    photos.find((p) => p.inventoryItemId === itemId && p.stage === stage)?.url ?? null;

  const activeStagePhotoCount = activeStage
    ? allItems.filter((item) => photoFor(item.id, activeStage)).length
    : 0;
  const allItemsCaptured = activeStage ? activeStagePhotoCount === allItems.length && allItems.length > 0 : false;

  async function capture(itemId: string, file: File) {
    if (!activeStage) return;
    setUploadingItemId(itemId);
    setError(null);
    const supabase = createClient();

    const path = `${ownerId}/${bookingId}/${activeStage}/${itemId}-${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("handover-photos").upload(path, file);
    if (uploadError) {
      setError(uploadError.message);
      setUploadingItemId(null);
      return;
    }
    const url = supabase.storage.from("handover-photos").getPublicUrl(path).data.publicUrl;

    const { data: photoRow, error: upsertError } = await supabase
      .from("booking_handover_photos")
      .upsert(
        { booking_id: bookingId, inventory_item_id: itemId, stage: activeStage, url },
        { onConflict: "booking_id,inventory_item_id,stage" },
      )
      .select("id, inventory_item_id, stage, url")
      .single();

    setUploadingItemId(null);
    if (upsertError || !photoRow) {
      setError(upsertError?.message ?? "Could not save photo");
      return;
    }

    setPhotos((prev) => [
      ...prev.filter((p) => !(p.inventoryItemId === itemId && p.stage === activeStage)),
      {
        id: photoRow.id,
        inventoryItemId: photoRow.inventory_item_id,
        stage: photoRow.stage,
        url: photoRow.url,
      },
    ]);
  }

  async function completeStage() {
    if (!activeStage || !allItemsCaptured) return;
    setCompleting(true);
    setError(null);
    const supabase = createClient();

    if (activeStage === "check_in") {
      const { error: upsertError } = await supabase
        .from("booking_handovers")
        .upsert(
          { booking_id: bookingId, status: "check_in_done", check_in_completed_at: new Date().toISOString() },
          { onConflict: "booking_id" },
        );
      if (upsertError) {
        setError(upsertError.message);
        setCompleting(false);
        return;
      }
      setStatus("check_in_done");
    } else {
      const { error: updateError } = await supabase
        .from("booking_handovers")
        .update({ status: "under_review", check_out_completed_at: new Date().toISOString() })
        .eq("booking_id", bookingId);
      if (updateError) {
        setError(updateError.message);
        setCompleting(false);
        return;
      }
      setStatus("under_review");
    }
    setCompleting(false);
    router.refresh();
  }

  if (allItems.length === 0) {
    return (
      <p className="text-sm text-ink-secondary">
        This property has no inventory checklist yet — add items under Inventory before running a
        handover.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      {activeStage ? (
        <div className="flex flex-col gap-xs rounded-md border border-turquoise/30 bg-turquoise-light/50 px-md py-sm">
          <p className="text-sm font-medium text-ink">
            {activeStage === "check_in" ? "Check-in — photograph every item" : "Check-out — photograph every item again"}
          </p>
          <p className="text-xs text-ink-secondary">
            {activeStagePhotoCount} / {allItems.length} items photographed. Use your phone&apos;s camera
            — a live photo, not one from your gallery.
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink-secondary">
          {status === "under_review"
            ? "Both check-in and check-out are photographed — an admin is reviewing them."
            : "Handover resolved."}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {inventory.map((category) => (
        <div key={category.id} className="flex flex-col gap-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-secondary">{category.name}</p>
          <div className="grid grid-cols-1 gap-sm sm:grid-cols-2">
            {category.items.map((item) => {
              const checkInUrl = photoFor(item.id, "check_in");
              const checkOutUrl = photoFor(item.id, "check_out");
              const activeUrl = activeStage === "check_out" ? checkOutUrl : checkInUrl;

              return (
                <div key={item.id} className="flex items-center gap-sm rounded-lg border border-border p-sm">
                  {item.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setLightbox(item.photoUrl!)}
                      className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border"
                      title="Reference photo"
                    >
                      <Image src={item.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                    </button>
                  )}
                  <div className="flex flex-1 flex-col gap-0.5">
                    <p className="text-sm font-medium text-ink">
                      {item.name} {item.quantity > 1 && `× ${item.quantity}`}
                    </p>
                    <div className="flex gap-sm text-xs text-ink-secondary">
                      {item.photoUrl && (
                        <button type="button" onClick={() => setLightbox(item.photoUrl!)} className="text-ink-secondary underline">
                          Reference
                        </button>
                      )}
                      {checkInUrl && (
                        <button type="button" onClick={() => setLightbox(checkInUrl)} className="text-turquoise-dark">
                          Check-in photo
                        </button>
                      )}
                      {checkOutUrl && (
                        <button type="button" onClick={() => setLightbox(checkOutUrl)} className="text-turquoise-dark">
                          Check-out photo
                        </button>
                      )}
                    </div>
                  </div>

                  {activeStage && (
                    <label className="flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-turquoise bg-turquoise-light text-turquoise-dark">
                      {activeUrl ? (
                        <Image src={activeUrl} alt="" width={48} height={48} className="size-12 object-cover" />
                      ) : uploadingItemId === item.id ? (
                        <span className="text-[10px]">…</span>
                      ) : (
                        <span className="text-xl leading-none">+</span>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void capture(item.id, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {activeStage && (
        <button
          type="button"
          onClick={completeStage}
          disabled={!allItemsCaptured || completing}
          className="w-fit rounded-md bg-turquoise px-lg py-sm text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {completing
            ? "Saving…"
            : activeStage === "check_in"
              ? "Complete check-in"
              : "Complete check-out & send to admin"}
        </button>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-lg"
          onClick={() => setLightbox(null)}
        >
          <div className="relative h-full max-h-[80vh] w-full max-w-xl">
            <Image src={lightbox} alt="" fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
