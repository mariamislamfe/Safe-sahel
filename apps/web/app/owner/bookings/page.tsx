import { redirect } from "next/navigation";
import Link from "next/link";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getOwnerBookings } from "@/lib/queries/owner-bookings";
import { GuestReviewForm } from "@/components/guest-review-form";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-butter-soft text-ink",
  confirmed: "bg-turquoise-light text-turquoise-dark",
  declined: "bg-red-50 text-red-700",
  cancelled: "bg-surface-soft text-ink-secondary",
  completed: "bg-surface-soft text-ink-secondary",
};

export default async function OwnerBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const bookings = await getOwnerBookings(user.id);

  const { data: reviewedRows } = await supabase
    .from("guest_reviews")
    .select("booking_id")
    .in(
      "booking_id",
      bookings.map((b) => b.id),
    );
  const reviewedBookingIds = new Set((reviewedRows ?? []).map((r) => r.booking_id));
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Bookings</h1>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border p-4xl text-center">
          <p className="font-medium text-ink">No bookings yet</p>
          <p className="max-w-sm text-sm text-ink-secondary">
            Bookings confirm instantly — they&apos;ll show up here as soon as a guest books.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-sm">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="flex flex-col gap-sm rounded-lg border border-border p-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-md">
                <div className="flex flex-col gap-xs">
                  <p className="font-display font-semibold text-ink">{booking.propertyTitle}</p>
                  <p className="text-sm text-ink-secondary">
                    {booking.guestName ?? "Guest"} · {booking.checkIn} → {booking.checkOut} ·{" "}
                    {booking.guestsCount} guests
                  </p>
                  <p className="text-sm font-medium text-ink">{formatEgp(booking.totalAmount)}</p>
                </div>
                <div className="flex items-center gap-md">
                  <span
                    className={`rounded-full px-sm py-xs text-xs font-medium capitalize ${statusStyles[booking.status]}`}
                  >
                    {booking.status.replace("_", " ")}
                  </span>
                  {booking.status === "confirmed" && (
                    <Link
                      href={`/owner/bookings/${booking.id}/handover`}
                      className="rounded-md border border-border px-md py-xs text-sm font-medium text-ink-secondary hover:border-turquoise hover:text-turquoise-dark"
                    >
                      Handover
                    </Link>
                  )}
                </div>
              </div>
              {booking.status === "confirmed" && (
                <div className="flex flex-wrap items-center gap-sm rounded-md bg-surface-soft px-md py-sm text-sm">
                  <span className="text-ink-secondary">Contact the guest to arrange the deposit:</span>
                  {booking.guestPhone ? (
                    <span className="flex gap-sm">
                      <a href={`tel:${booking.guestPhone}`} className="font-medium text-turquoise-dark">
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${booking.guestPhone.replace(/\D/g, "").replace(/^0/, "20")}`}
                        className="font-medium text-turquoise-dark"
                      >
                        WhatsApp
                      </a>
                    </span>
                  ) : (
                    <span className="text-xs text-ink-secondary">No phone number added yet</span>
                  )}
                </div>
              )}
              {booking.status === "confirmed" &&
                booking.checkOut < today &&
                !reviewedBookingIds.has(booking.id) && (
                  <GuestReviewForm
                    bookingId={booking.id}
                    ownerId={user.id}
                    guestId={booking.guestId}
                  />
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
