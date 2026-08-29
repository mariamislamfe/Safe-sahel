import Image from "next/image";
import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { SearchBar } from "@/components/search-bar";
import { SectionCarousel } from "@/components/section-carousel";
import { CategoryCard } from "@/components/category-card";
import { LocationCard } from "@/components/location-card";
import { PropertyCard, fromRealProperty } from "@/components/property-card";
import { getPublishedProperties } from "@/lib/queries/properties";
import { getLocations } from "@/lib/queries/locations";
import { getSubscriptionPriceEgp } from "@/lib/queries/availability";
import { BudgetPlannerWidget } from "@/components/budget-planner-widget";
import { formatEgp } from "@safe-sahel/utils";

const categories = [
  {
    id: "villa",
    imageUrl: "https://images.unsplash.com/photo-1582610116397-edb318620f90?auto=format&fit=crop&w=900&h=900&q=85",
  },
  {
    id: "chalet",
    imageUrl: "https://images.unsplash.com/photo-1688604693147-ff99ce13e291?auto=format&fit=crop&w=900&h=900&q=85",
  },
  {
    id: "apartment",
    imageUrl: "https://images.unsplash.com/photo-1624204386084-dd8c05e32226?auto=format&fit=crop&w=900&h=900&q=85",
  },
  {
    id: "hotel",
    imageUrl: "https://images.unsplash.com/photo-1663344552935-5bdbaa92454b?auto=format&fit=crop&w=900&h=900&q=85",
  },
] as const;

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path d="M4 10.5L8 14.5L16 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M3 9.5C3 5.9 6.13 3 10 3s7 2.9 7 6.5-3.13 6.5-7 6.5c-.87 0-1.7-.15-2.47-.42L4 17l1.05-3.2A6.2 6.2 0 013 9.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M10 2.5l6 2.2v4.6c0 4-2.6 6.9-6 8.2-3.4-1.3-6-4.2-6-8.2V4.7l6-2.2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M7.5 10l1.8 1.8L12.8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default async function HomePage() {
  const locale = await getLocale();
  const t = getDictionary(locale).home;

  const [properties, locations, subscriptionPriceEgp] = await Promise.all([
    getPublishedProperties().catch(() => []),
    getLocations().catch(() => []),
    getSubscriptionPriceEgp().catch(() => 500),
  ]);
  const originalPriceEgp = subscriptionPriceEgp * 2;

  const displayProperties = properties.map(fromRealProperty);
  const topRated = [...displayProperties].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  const trustItems = [
    { Icon: CheckIcon, title: t.trust.verifiedTitle, body: t.trust.verifiedBody },
    { Icon: ChatIcon, title: t.trust.directTitle, body: t.trust.directBody },
    { Icon: ShieldIcon, title: t.trust.depositTitle, body: t.trust.depositBody },
  ];

  return (
    <main className="flex flex-col gap-4xl pb-4xl">
      <BudgetPlannerWidget locale={locale} />
      {/* Hero — -mt-16 cancels the layout's pt-16 so this bleeds under the fixed, transparent-over-hero header */}
      <section className="relative -mt-16 overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1630512996510-c6a301d874cc?auto=format&fit=crop&w=1920&q=80"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/35 to-surface" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(247,231,168,0.35),transparent_45%)]"
          />
        </div>

        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-xl px-lg pb-4xl pt-32 text-center sm:pt-40">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-butter">{t.kicker}</p>
          <h1 className="text-balance font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            {t.title}
          </h1>
          <p className="max-w-xl text-balance text-lg text-white/85">{t.lede}</p>

          <div className="mt-md w-full">
            <SearchBar locations={locations.map((l) => l.name)} />
          </div>
        </div>
      </section>

      {/* Trust row — no icon circles, just clean type + line icons */}
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-lg px-lg sm:flex-row sm:gap-2xl">
        {trustItems.map((item) => (
          <div key={item.title} className="flex flex-1 items-start gap-md">
            <item.Icon />
            <div className="flex flex-col gap-0.5">
              <p className="font-display text-sm font-semibold text-ink">{item.title}</p>
              <p className="text-xs text-ink-secondary">{item.body}</p>
            </div>
          </div>
        ))}
      </section>

      <div id="discover" className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col gap-4xl px-lg">
        {/* Categories */}
        <SectionCarousel title={t.exploreStays}>
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              label={t.categories[category.id]}
              imageUrl={category.imageUrl}
              href={`/search?type=${category.id}`}
            />
          ))}
        </SectionCarousel>

        {/* Locations */}
        {locations.length > 0 && (
          <SectionCarousel title={t.exploreByLocation} subtitle={t.exploreByLocationSubtitle} seeAllHref="/locations">
            {locations.map((location) => (
              <div key={location.id} className="w-40 flex-none sm:w-48">
                <LocationCard
                  name={location.name}
                  area={location.area}
                  propertyCount={location.propertyCount}
                  imageUrl={location.coverImageUrl}
                />
              </div>
            ))}
          </SectionCarousel>
        )}

        {/* Discovery sections — real listings only */}
        {displayProperties.length > 0 ? (
          <>
            <SectionCarousel title={t.newOnSafeSahel} seeAllHref="/search">
              {displayProperties.map((property, i) => (
                <div key={property.id} className="w-64 flex-none sm:w-72">
                  <PropertyCard property={property} priority={i < 2} />
                </div>
              ))}
            </SectionCarousel>

            {topRated.some((p) => p.rating !== null) && (
              <SectionCarousel title={t.topRated} subtitle={t.topRatedSubtitle} seeAllHref="/search">
                {topRated
                  .filter((p) => p.rating !== null)
                  .map((property) => (
                    <div key={property.id} className="w-64 flex-none sm:w-72">
                      <PropertyCard property={property} />
                    </div>
                  ))}
              </SectionCarousel>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-sm rounded-2xl border border-dashed border-border px-lg py-4xl text-center">
            <p className="font-display text-lg font-semibold text-ink">{t.noStaysTitle}</p>
            <p className="max-w-sm text-sm text-ink-secondary">{t.noStaysBody}</p>
            <Link href="/owner" className="mt-sm text-sm font-medium text-turquoise-dark">
              {t.listFirst}
            </Link>
          </div>
        )}
      </div>

      {/* Owner CTA band */}
      <section className="mx-auto w-full max-w-6xl px-lg">
        <div className="flex flex-col items-center gap-md rounded-2xl bg-ink px-xl py-4xl text-center sm:px-4xl">
          <span className="rounded-full bg-butter px-md py-1 text-xs font-semibold text-ink">{t.limitedOffer}</span>
          <p className="font-display text-2xl font-bold text-white sm:text-3xl">{t.ctaTitle}</p>
          <p className="max-w-md text-white/70">{t.ctaBody}</p>
          <p className="flex items-baseline gap-sm">
            <span className="text-lg text-white/50 line-through">{formatEgp(originalPriceEgp)}</span>
            <span className="font-display text-2xl font-bold text-turquoise">{formatEgp(subscriptionPriceEgp)}</span>
            <span className="text-sm text-white/70">{t.perMonth}</span>
          </p>
          <Link
            href="/owner"
            className="mt-sm rounded-full bg-turquoise px-xl py-md font-semibold text-white shadow-sm transition-colors hover:bg-turquoise-dark"
          >
            {t.ctaButton}
          </Link>
        </div>
      </section>
    </main>
  );
}
