import Image from "next/image";
import Link from "next/link";

export function CategoryCard({
  label,
  imageUrl,
  href,
}: {
  label: string;
  imageUrl: string;
  href: string;
}) {
  return (
    <Link href={href} className="group flex w-36 flex-none flex-col gap-sm sm:w-44">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl shadow-sm transition-transform duration-300 group-hover:scale-[1.02]">
        <Image
          src={imageUrl}
          alt=""
          fill
          sizes="(min-width: 640px) 176px, 144px"
          className="object-cover"
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-ink/55 via-transparent to-transparent" />
        <span className="absolute inset-x-0 bottom-0 p-md font-display text-sm font-semibold text-white sm:text-base">
          {label}
        </span>
      </div>
    </Link>
  );
}
