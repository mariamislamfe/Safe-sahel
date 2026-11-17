import Link from "next/link";
import { getLocale } from "@/lib/locale";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { dateTime } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import { getHandoversUnderReview } from "@/lib/queries/handover";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

export default async function AdminHandoversPage() {
  await requireSection("handovers");
  const locale = await getLocale();
  const t = adminShellDict[locale].handovers;
  const handovers = await getHandoversUnderReview();

  return (
    <>
      <PageHeader title={t.title} description={t.body} count={handovers.length} />
      {handovers.length === 0 ? (
        <EmptyState icon="clipboard" title={t.empty} />
      ) : (
        <div className="flex flex-col gap-sm">
          {handovers.map((h) => (
            <Link
              key={h.bookingId}
              href={`/admin/handovers/${h.bookingId}`}
              className="group flex items-center justify-between gap-md rounded-2xl border border-border bg-surface p-md shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-turquoise hover:shadow-md"
            >
              <div className="flex flex-col gap-0.5">
                <p className="font-display font-semibold">{h.propertyTitle}</p>
                <p className="text-sm text-ink-secondary">
                  {t.guest}: {h.guestName ?? "—"}
                </p>
              </div>
              <div className="flex items-center gap-sm text-xs text-ink-secondary">
                {h.checkOutCompletedAt && (
                  <span>
                    {t.checkedOut} {dateTime(locale, h.checkOutCompletedAt)}
                  </span>
                )}
                <Icon name="arrow" className="size-4 rtl:-scale-x-100" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
