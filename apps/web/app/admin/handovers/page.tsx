import Link from "next/link";
import { getHandoversUnderReview } from "@/lib/queries/handover";

export default async function AdminHandoversPage() {
  const handovers = await getHandoversUnderReview();

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Handovers awaiting review</h1>

      {handovers.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          Nothing to review — handovers show up here once an owner completes check-out photos.
        </p>
      ) : (
        <div className="flex flex-col gap-sm">
          {handovers.map((h) => (
            <Link
              key={h.bookingId}
              href={`/admin/handovers/${h.bookingId}`}
              className="flex flex-wrap items-center justify-between gap-md rounded-lg border border-border p-md hover:border-turquoise"
            >
              <div className="flex flex-col gap-xs">
                <p className="font-display font-semibold text-ink">{h.propertyTitle}</p>
                <p className="text-sm text-ink-secondary">{h.guestName ?? "Guest"}</p>
              </div>
              {h.checkOutCompletedAt && (
                <p className="text-xs text-ink-secondary">
                  Checked out {new Date(h.checkOutCompletedAt).toLocaleString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
