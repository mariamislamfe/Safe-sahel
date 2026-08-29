import { redirect } from "next/navigation";
import Link from "next/link";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { ReviewForm } from "@/components/review-form";
import { CancelBookingButton } from "@/components/cancel-booking-button";

const statusStyles: Record<string, string> = {
  pending_payment: "bg-butter-soft text-ink",
  confirmed: "bg-turquoise-light text-turquoise-dark",
  declined: "bg-red-50 text-red-700",
  cancelled: "bg-surface-soft text-ink-secondary",
  completed: "bg-surface-soft text-ink-secondary",
};

export default async function GuestBookingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select(
      "id, property_id, check_in, check_out, guests_count, total_amount, deposit_amount, status, cancellation_fee_amount",
    )
    .eq("guest_id", user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const properties = new Map<string, { title: string; slug: string }>();
  if (bookings && bookings.length > 0) {
    const { data: rows } = await supabase
      .from("properties")
      .select("id, title, slug")
      .in(
        "id",
        bookings.map((b) => b.property_id),
      );
    for (const row of rows ?? []) properties.set(row.id, { title: row.title, slug: row.slug });
  }

  const { data: reviewedRows } = await supabase
    .from("reviews")
    .select("booking_id")
    .in(
      "booking_id",
      (bookings ?? []).map((b) => b.id),
    );
  const reviewedBookingIds = new Set((reviewedRows ?? []).map((r) => r.booking_id));

  const { data: handoverRows } = await supabase
    .from("booking_handovers")
    .select("booking_id, status, deduction_amount, deduction_reason, refund_amount")
    .in(
      "booking_id",
      (bookings ?? []).map((b) => b.id),
    );
  const handoverByBookingId = new Map((handoverRows ?? []).map((h) => [h.booking_id, h]));

  const today = new Date().toISOString().slice(0, 10);

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-lg px-lg py-2xl">
      <h1 className="font-display text-2xl font-bold">Your bookings</h1>

      {!bookings || bookings.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-lg border border-dashed border-border p-4xl text-center">
          <p className="font-medium text-ink">No bookings yet</p>
          <Link href="/search" className="text-sm font-medium text-turquoise-dark">
            Browse properties
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-md">
          {bookings.map((booking) => {
            const property = properties.get(booking.property_id);
            const canReview =
              booking.status === "confirmed" &&
              booking.check_out < today &&
              !reviewedBookingIds.has(booking.id);
            const handover = handoverByBookingId.get(booking.id);

            return (
              <div
                key={booking.id}
                className="flex flex-col gap-sm rounded-lg border border-border p-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-md">
                  <div className="flex flex-col gap-xs">
                    <Link
                      href={property ? `/properties/${property.slug}` : "#"}
                      className="font-display font-semibold text-ink hover:text-turquoise-dark"
                    >
                      {property?.title ?? "Property"}
                    </Link>
                    <p className="text-sm text-ink-secondary">
                      {booking.check_in} → {booking.check_out} · {booking.guests_count} guests
                    </p>
                    <p className="text-sm font-medium text-ink">
                      {formatEgp(Number(booking.total_amount))}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-xs">
                    <span
                      className={`rounded-full px-sm py-xs text-xs font-medium capitalize ${statusStyles[booking.status]}`}
                    >
                      {booking.status.replace("_", " ")}
                    </span>
                    {(booking.status === "pending_payment" || booking.status === "confirmed") &&
                      booking.check_in > today && (
                        <CancelBookingButton
                          bookingId={booking.id}
                          checkIn={booking.check_in}
                          depositAmount={Number(booking.deposit_amount)}
                        />
                      )}
                  </div>
                </div>

                {booking.status === "cancelled" && Number(booking.cancellation_fee_amount) > 0 && (
                  <p className="rounded-md bg-red-50 px-md py-sm text-xs text-red-700">
                    Cancelled within 3 days of check-in — {formatEgp(Number(booking.cancellation_fee_amount))}{" "}
                    deposit forfeited.
                  </p>
                )}

                {handover && handover.status !== "pending" && (
                  <div className="rounded-md bg-surface-soft px-md py-sm text-xs text-ink-secondary">
                    {handover.status === "check_in_done" && "Check-in photos done — check-out is next."}
                    {handover.status === "under_review" && "Check-out done — an admin is reviewing it."}
                    {handover.status === "resolved" &&
                      (Number(handover.deduction_amount) > 0 ? (
                        <>
                          Handover reviewed: {formatEgp(Number(handover.deduction_amount))} deducted
                          {handover.deduction_reason && ` (${handover.deduction_reason})`} — refunded{" "}
                          {formatEgp(Number(handover.refund_amount ?? 0))}.
                        </>
                      ) : (
                        <>Handover reviewed — no deductions, full deposit refunded.</>
                      ))}
                  </div>
                )}

                {canReview && (
                  <ReviewForm
                    bookingId={booking.id}
                    propertyId={booking.property_id}
                    guestId={user.id}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
