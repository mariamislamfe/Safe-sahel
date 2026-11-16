import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@safe-sahel/types";
import { getDictionary } from "@/lib/i18n/dictionary";

export function LocationCard({
  name,
  nameAr,
  area,
  propertyCount,
  imageUrl,
  locale = "en",
}: {
  name: string;
  nameAr?: string | null;
  area: string | null;
  propertyCount: number;
  imageUrl: string | null;
  locale?: Locale;
}) {
  const t = getDictionary(locale).home;
  const display = locale === "ar" && nameAr ? nameAr : name;
  const comingSoon = propertyCount === 0;

  const body = (
    <>
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={display}
          fill
          sizes="192px"
          className={`object-cover transition-transform duration-500 group-hover:scale-105 ${comingSoon ? "opacity-60 grayscale" : ""}`}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      {comingSoon && (
        <span className="absolute start-sm top-sm rounded-full bg-butter px-sm py-0.5 text-xs font-semibold text-ink">
          {t.comingSoon}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-md">
        <p className="font-display text-base font-bold text-white">{display}</p>
        <p className="text-xs text-white/85">
          {area && `${area} · `}
          {comingSoon ? t.comingSoon : t.staysCount(propertyCount)}
        </p>
      </div>
    </>
  );

  const className =
    "group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-turquoise-light to-surface-soft";

  // Nothing to browse yet → not a link to an empty search page.
  return comingSoon ? (
    <div className={className}>{body}</div>
  ) : (
    <Link href={`/search?location=${encodeURIComponent(name)}`} className={className}>
      {body}
    </Link>
  );
}
