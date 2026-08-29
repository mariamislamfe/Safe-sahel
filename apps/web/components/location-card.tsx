import Image from "next/image";
import Link from "next/link";

export function LocationCard({
  name,
  area,
  propertyCount,
  imageUrl,
}: {
  name: string;
  area: string | null;
  propertyCount: number;
  imageUrl: string | null;
}) {
  return (
    <Link
      href={`/search?location=${encodeURIComponent(name)}`}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-xl bg-gradient-to-br from-turquoise-light to-surface-soft"
    >
      {imageUrl && (
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="192px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 p-md">
        <p className="font-display text-base font-bold text-white">{name}</p>
        <p className="text-xs text-white/85">
          {area && `${area} · `}
          {propertyCount} {propertyCount === 1 ? "stay" : "stays"}
        </p>
      </div>
    </Link>
  );
}
