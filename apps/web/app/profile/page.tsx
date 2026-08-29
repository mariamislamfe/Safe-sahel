import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getHostRatingSummary,
  getGuestRatingSummary,
  getMyVerificationRequest,
} from "@/lib/queries/profile";
import { ProfileEditor } from "@/components/profile-editor";

const verificationStatusCopy: Record<string, string> = {
  pending: "Your verification request is in — we'll be in touch soon to complete the process.",
  contacted: "We've reached out to you to complete verification.",
  approved: "You're verified.",
  rejected: "Your last verification request wasn't approved. You can submit a new one.",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, username, phone, role, verified")
    .eq("id", user.id)
    .single();

  const profile = {
    id: user.id,
    email: user.email,
    fullName: profileRow?.full_name ?? null,
    avatarUrl: profileRow?.avatar_url ?? null,
    username: profileRow?.username ?? null,
    phone: profileRow?.phone ?? null,
    role: profileRow?.role ?? "guest",
    verified: profileRow?.verified ?? false,
  };

  const [hostRating, guestRating, verificationRequest] = await Promise.all([
    profile.role === "owner" || profile.role === "admin"
      ? getHostRatingSummary(user.id)
      : Promise.resolve(null),
    getGuestRatingSummary(user.id),
    getMyVerificationRequest(user.id),
  ]);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-2xl px-lg py-2xl">
      <div className="flex flex-wrap items-center gap-sm">
        <h1 className="font-display text-2xl font-bold tracking-tight">Profile</h1>
        <span className="rounded-full bg-surface-soft px-md py-xs text-xs font-semibold capitalize text-ink-secondary">
          {profile.role === "admin" ? "Admin" : profile.role === "owner" ? "Host" : "Guest"}
        </span>
        {profile.verified && (
          <span className="flex items-center gap-1 rounded-full bg-butter px-md py-xs text-xs font-semibold text-ink">
            ✓ Verified
          </span>
        )}
      </div>

      <ProfileEditor profile={profile} />

      {/* Verification */}
      <div className="flex flex-col gap-sm rounded-xl border border-border p-lg">
        <h2 className="font-display text-base font-semibold">Verification</h2>
        {profile.verified ? (
          <p className="text-sm text-ink-secondary">
            Your account is verified — a badge shows next to your name and your listings get
            priority in search.
          </p>
        ) : verificationRequest ? (
          <p className="text-sm text-ink-secondary">
            {verificationStatusCopy[verificationRequest.status]}
          </p>
        ) : (
          <>
            <p className="text-sm text-ink-secondary">
              Get a verified badge next to your name and priority placement for your listings.
            </p>
            <Link
              href="/profile/verify"
              className="w-fit rounded-md border border-turquoise px-lg py-sm text-sm font-medium text-turquoise-dark hover:bg-turquoise-light"
            >
              Request verification
            </Link>
          </>
        )}
        {verificationRequest?.status === "rejected" && (
          <Link
            href="/profile/verify"
            className="w-fit text-sm font-medium text-turquoise-dark hover:underline"
          >
            Submit a new request
          </Link>
        )}
      </div>

      {/* Host rating */}
      {hostRating && hostRating.reviewCount > 0 && (
        <div className="flex flex-col gap-md rounded-xl border border-border p-lg">
          <h2 className="font-display text-base font-semibold">
            <span className="text-butter">★</span> {hostRating.averageRating?.toFixed(1)} hosting
            rating · {hostRating.reviewCount} review{hostRating.reviewCount === 1 ? "" : "s"}
          </h2>
          <div className="flex flex-col gap-sm">
            {hostRating.recentReviews.map((review, i) => (
              <div key={i} className="rounded-lg bg-surface-soft p-md text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{review.guestName ?? "Guest"}</span>
                  <span className="text-butter">{"★".repeat(review.ratingOverall)}</span>
                </div>
                {review.comment && <p className="mt-1 text-ink-secondary">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guest rating */}
      {guestRating.reviewCount > 0 && (
        <div className="flex flex-col gap-md rounded-xl border border-border p-lg">
          <h2 className="font-display text-base font-semibold">
            <span className="text-butter">★</span> {guestRating.averageRating?.toFixed(1)} guest
            rating · {guestRating.reviewCount} review{guestRating.reviewCount === 1 ? "" : "s"}
          </h2>
          <div className="flex flex-col gap-sm">
            {guestRating.recentReviews.map((review, i) => (
              <div key={i} className="rounded-lg bg-surface-soft p-md text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-ink">{review.ownerName ?? "Host"}</span>
                  <span className="text-butter">{"★".repeat(review.rating)}</span>
                </div>
                {review.comment && <p className="mt-1 text-ink-secondary">{review.comment}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* History */}
      <div className="flex flex-col gap-sm rounded-xl border border-border p-lg">
        <h2 className="font-display text-base font-semibold">History</h2>
        <Link href="/account/bookings" className="text-sm text-turquoise-dark hover:underline">
          Places I&apos;ve booked →
        </Link>
        {(profile.role === "owner" || profile.role === "admin") && (
          <Link href="/owner/bookings" className="text-sm text-turquoise-dark hover:underline">
            Guests who&apos;ve booked with me →
          </Link>
        )}
      </div>
    </main>
  );
}
