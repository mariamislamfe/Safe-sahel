import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { Icon } from "@/components/admin/icons";

const copy = {
  en: {
    title: "We couldn't find that page",
    body: "The link may be old, or the listing is no longer available.",
    search: "Browse stays",
    home: "Go home",
  },
  ar: {
    title: "الصفحة دي مش موجودة",
    body: "ممكن اللينك قديم، أو الإعلان مابقاش متاح.",
    search: "تصفح الأماكن",
    home: "الرئيسية",
  },
};

export default async function NotFound() {
  const t = copy[await getLocale()];
  return (
    <main className="grid min-h-[60vh] place-items-center px-lg py-3xl">
      <div className="flex max-w-sm flex-col items-center gap-md text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-turquoise-light text-turquoise-dark">
          <Icon name="compass" className="size-7" />
        </span>
        <p className="font-display text-5xl font-extrabold text-turquoise">404</p>
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-ink-secondary">{t.body}</p>
        <div className="flex gap-sm">
          <Link
            href="/search"
            className="rounded-xl bg-turquoise px-lg py-2.5 text-sm font-semibold text-white hover:bg-turquoise-dark"
          >
            {t.search}
          </Link>
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
