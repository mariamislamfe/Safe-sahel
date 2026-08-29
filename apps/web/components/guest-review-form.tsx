"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function GuestReviewForm({
  bookingId,
  ownerId,
  guestId,
}: {
  bookingId: string;
  ownerId: string;
  guestId: string;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("guest_reviews").insert({
      booking_id: bookingId,
      owner_id: ownerId,
      guest_id: guestId,
      rating,
      comment: comment || null,
    });

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setDone(true);
    router.refresh();
  }

  if (done) return <p className="text-sm text-turquoise-dark">Thanks for rating this guest!</p>;

  return (
    <div className="flex flex-col gap-sm rounded-md border border-border p-md">
      <div className="flex items-center justify-between gap-md text-sm">
        <span className="text-ink-secondary">Rate this guest</span>
        <div className="flex gap-xs">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              className={n <= rating ? "text-butter" : "text-border"}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was this guest to host?"
        rows={2}
        className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-fit rounded-md bg-turquoise px-md py-xs text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit rating"}
      </button>
    </div>
  );
}
