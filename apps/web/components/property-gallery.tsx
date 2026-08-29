"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { Locale } from "@safe-sahel/types";
import { getDictionary } from "@/lib/i18n/dictionary";

export function PropertyGallery({
  images,
  title,
  locale,
}: {
  images: { url: string; isCover: boolean }[];
  title: string;
  locale: Locale;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const dict = getDictionary(locale);
  const morePhotosLabel = dict.propertyDetail.showAllPhotos;
  const photoOfLabel = dict.propertyDetail.photoOf;
  const noPhotoLabel = dict.property.noPhoto;

  useEffect(() => {
    if (openIndex === null) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenIndex(null);
      if (e.key === "ArrowRight") setOpenIndex((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft")
        setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openIndex, images.length]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/8] w-full items-center justify-center rounded-2xl bg-surface-soft text-sm text-ink-secondary">
        {noPhotoLabel}
      </div>
    );
  }

  const extraCount = images.length - 5;

  return (
    <>
      <div className="grid grid-cols-1 gap-1.5 overflow-hidden rounded-2xl sm:grid-cols-4 sm:grid-rows-2">
        <button
          type="button"
          onClick={() => setOpenIndex(0)}
          className="relative aspect-[16/10] w-full bg-surface-soft sm:col-span-2 sm:row-span-2 sm:aspect-auto"
        >
          <Image
            src={images[0]!.url}
            alt={title}
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </button>
        {images.slice(1, 5).map((img, i) => {
          const index = i + 1;
          const isLastVisible = index === 4 && extraCount > 0;
          return (
            <button
              type="button"
              key={img.url}
              onClick={() => setOpenIndex(index)}
              className="relative hidden aspect-square w-full bg-surface-soft sm:block"
            >
              <Image src={img.url} alt="" fill sizes="25vw" className="object-cover" />
              {isLastVisible && (
                <span className="absolute inset-0 flex items-center justify-center bg-ink/50 font-display text-lg font-semibold text-white">
                  {morePhotosLabel(extraCount)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-ink/95 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-lg py-md text-white">
            <span className="text-sm">{photoOfLabel(openIndex + 1, images.length)}</span>
            <button
              type="button"
              onClick={() => setOpenIndex(null)}
              className="rounded-full p-sm text-2xl leading-none hover:bg-white/10"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center px-lg pb-lg">
            <div className="relative h-full w-full max-w-4xl">
              <Image
                src={images[openIndex]!.url}
                alt=""
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setOpenIndex((i) => (i === null ? i : (i - 1 + images.length) % images.length))}
                  className="absolute inset-y-0 start-0 flex items-center px-sm text-3xl text-white/80 hover:text-white"
                  aria-label="Previous photo"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setOpenIndex((i) => (i === null ? i : (i + 1) % images.length))}
                  className="absolute inset-y-0 end-0 flex items-center px-sm text-3xl text-white/80 hover:text-white"
                  aria-label="Next photo"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
