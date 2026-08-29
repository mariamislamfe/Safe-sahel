import Link from "next/link";
import type { Locale } from "@safe-sahel/types";
import { getDictionary } from "@/lib/i18n/dictionary";

export function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).footer;

  const columns = [
    {
      title: t.explore,
      links: [
        { href: "/search", label: locale === "ar" ? "كل الإقامات" : "All stays" },
        { href: "/locations", label: locale === "ar" ? "الأماكن" : "Locations" },
        { href: "/search?type=villa", label: locale === "ar" ? "فيلات" : "Villas" },
        { href: "/search?type=chalet", label: locale === "ar" ? "شاليهات" : "Chalets" },
      ],
    },
    {
      title: t.hosting,
      links: [
        { href: "/owner", label: locale === "ar" ? "أضف عقارك" : "List your property" },
        { href: "/profile/verify", label: t.getVerified },
      ],
    },
    {
      title: t.support,
      links: [
        { href: "https://wa.me/201123094983", label: "WhatsApp: 01123094983", external: true },
        { href: "/profile", label: t.account },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-surface-soft">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-xl px-lg py-3xl sm:grid-cols-4">
        <div className="col-span-2 flex flex-col gap-sm sm:col-span-1">
          <div className="flex items-center gap-sm">
            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-turquoise to-turquoise-dark font-display text-xs font-extrabold text-white">
              SS
            </div>
            <span className="font-display text-[15px] font-bold tracking-tight">Safe Sahel</span>
          </div>
          <p className="text-sm text-ink-secondary">{t.tagline}</p>
        </div>

        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-sm">
            <p className="text-sm font-semibold text-ink">{column.title}</p>
            {column.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                target={"external" in link && link.external ? "_blank" : undefined}
                rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                className="text-sm text-ink-secondary transition-colors hover:text-turquoise-dark"
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="border-t border-border px-lg py-lg text-center text-xs text-ink-secondary">
        © {new Date().getFullYear()} Safe Sahel. {t.rights}
      </div>
    </footer>
  );
}
