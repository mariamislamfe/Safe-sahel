"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { Icon } from "@/components/admin/icons";

const copy = {
  en: {
    title: "Something went wrong",
    body: "It's on us, not you. Try again — if it keeps happening, contact Safe Sahel support.",
    retry: "Try again",
    home: "Go home",
  },
  ar: {
    title: "حصلت مشكلة",
    body: "الغلط عندنا مش عندك. جرّب تاني — ولو المشكلة فضلت، كلّم دعم سيف الساحل.",
    retry: "جرّب تاني",
    home: "الرئيسية",
  },
};

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = copy[useLocale()];
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-lg py-3xl">
      <div className="flex max-w-sm flex-col items-center gap-md text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-red-50 text-red-600">
          <Icon name="alert" className="size-7" />
        </span>
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-ink-secondary">{t.body}</p>
        {error.digest && <p className="font-mono text-xs text-ink-secondary">#{error.digest}</p>}
        <div className="flex gap-sm">
          <button
            onClick={() => retry()}
            className="rounded-xl bg-turquoise px-lg py-2.5 text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            {t.retry}
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-lg py-2.5 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            {t.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
