import Link from "next/link";

export function SectionCarousel({
  title,
  subtitle,
  seeAllHref,
  children,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-md">
      <div className="flex items-end justify-between gap-md px-lg sm:px-0">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            {title}
          </h2>
          {subtitle && <p className="text-sm text-ink-secondary">{subtitle}</p>}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="shrink-0 text-sm font-medium text-turquoise-dark hover:text-turquoise-dark/80"
          >
            See all →
          </Link>
        )}
      </div>
      <div className="scrollbar-none -mx-lg flex gap-md overflow-x-auto scroll-smooth px-lg pb-2 sm:mx-0 sm:px-0">
        {children}
      </div>
    </section>
  );
}
