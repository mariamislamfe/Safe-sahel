"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const dimensions = [
  ["ratingOverall", "Overall"],
  ["ratingCleanliness", "Cleanliness"],
  ["ratingAccuracy", "Accuracy"],
  ["ratingLocation", "Location"],
  ["ratingValue", "Value"],
] as const;

export function ReviewForm({
  bookingId,
  propertyId,
  guestId,
}: {
  bookingId: string;
  propertyId: string;
  guestId: string;
}) {
  const router = useRouter();
  const [ratings, setRatings] = useState<Record<string, number>>({
    ratingOverall: 5,
    ratingCleanliness: 5,
    ratingAccuracy: 5,
    ratingLocation: 5,
    ratingValue: 5,
  });
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      property_id: propertyId,
      guest_id: guestId,
      rating_overall: ratings.ratingOverall!,
      rating_cleanliness: ratings.ratingCleanliness!,
      rating_accuracy: ratings.ratingAccuracy!,
      rating_location: ratings.ratingLocation!,
      rating_value: ratings.ratingValue!,
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

  if (done) return <p className="text-sm text-turquoise-dark">Thanks for your review!</p>;

  return (
    <div className="flex flex-col gap-sm rounded-md border border-border p-md">
      {dimensions.map(([key, label]) => (
        <label key={key} className="flex items-center justify-between gap-md text-sm">
          <span className="text-ink-secondary">{label}</span>
          <div className="flex gap-xs">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRatings((prev) => ({ ...prev, [key]: n }))}
                className={n <= (ratings[key] ?? 0) ? "text-butter" : "text-border"}
              >
                ★
              </button>
            ))}
          </div>
        </label>
      ))}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="How was your stay?"
        rows={3}
        className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={submitting}
        className="w-fit rounded-md bg-turquoise px-md py-xs text-sm font-medium text-white hover:bg-turquoise-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </div>
  );
}
