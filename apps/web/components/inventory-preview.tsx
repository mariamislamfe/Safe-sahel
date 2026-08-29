"use client";

import { useState } from "react";
import Image from "next/image";
import type { InventoryCategory } from "@/lib/queries/owner";

export function InventoryPreview({ inventory, title }: { inventory: InventoryCategory[]; title: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const items = inventory.flatMap((c) => c.items);
  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-md border-b border-border pb-xl">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => item.photoUrl && setLightbox(item.photoUrl)}
            disabled={!item.photoUrl}
            className="flex flex-col items-center gap-xs rounded-lg border border-border p-sm text-center disabled:cursor-default"
          >
            <div className="relative size-14 overflow-hidden rounded-lg bg-surface-soft">
              {item.photoUrl && <Image src={item.photoUrl} alt="" fill sizes="56px" className="object-cover" />}
            </div>
            <span className="text-xs text-ink">
              {item.name} {item.quantity > 1 && `× ${item.quantity}`}
            </span>
          </button>
        ))}
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-lg"
          onClick={() => setLightbox(null)}
        >
          <div className="relative h-full max-h-[70vh] w-full max-w-md">
            <Image src={lightbox} alt="" fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
