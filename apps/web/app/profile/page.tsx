import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { dashboardDict } from "@/lib/i18n/dashboard";
import {
  getHostRatingSummary,
  getGuestRatingSummary,
  getMyVerificationRequest,
} from "@/lib/queries/profile";
import { ProfileEditor } from "@/components/profile-editor";
import { ActionRow, Card, PageHeader, Pill } from "@/components/admin/ui";
import { Icon } from "@/components/admin/icons";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-sm tracking-tight text-amber-500" aria-label={`${n}/5`}>
      {"★".repeat(n)}
      <span className="text-border">{"★".repeat(Math.max(0, 5 - n))}</span>
    </span>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/profile");

  const t = dashboardDict[await getLocale()].profile;

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
    canAccessAdmin: profileRow?.role === "admin",
  };
  const isHost = profile.role === "owner" || profile.role === "admin";

  const [hostRating, guestRating, verificationRequest] = await Promise.all([
    isHost ? getHostRatingSummary(user.id) : Promise.resolve(null),
    getGuestRatingSummary(user.id),
    isHost ? getMyVerificationRequest(user.id) : Promise.resolve(null),
  ]);

  const ratings = [
    hostRating && hostRating.reviewCount > 0
      ? {
          title: t.hostRating,
          avg: hostRating.averageRating,
          count: hostRating.reviewCount,
          items: hostRating.recentReviews.map((r) => ({
            name: r.guestName ?? t.guest,
            stars: r.ratingOverall,
            comment: r.comment,
          })),
        }
      : null,
    guestRating.reviewCount > 0
      ? {
          title: t.guestRating,
          avg: guestRating.averageRating,
          count: guestRating.reviewCount,
          items: guestRating.recentReviews.map((r) => ({
            name: r.ownerName ?? t.host,
            stars: r.rating,
            comment: r.comment,
          })),
        }
      : null,
  ].filter((r) => r !== null);

  return (
    <>
      <PageHeader
        title={t.title}
        actions={
          <div className="flex items-center gap-xs">
            <Pill tone="neutral">{t.roles[profile.role] ?? profile.role}</Pill>
            {profile.verified && (
              <Pill tone="success">
                <Icon name="check" className="size-3.5" strokeWidth={2.6} />
                {t.verified}
              </Pill>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-lg lg:grid-cols-[1fr_320px]">
        <Card className="flex flex-col gap-lg">
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-lg font-semibold">{t.details}</h2>
            <p className="text-sm text-ink-secondary">{t.detailsBody}</p>
          </div>
          <ProfileEditor profile={profile} />
        </Card>

        <div className="flex flex-col gap-md">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-ink-secondary">
            {t.shortcuts}
          </h2>
          <ActionRow href="/account/bookings" icon="calendar" label={t.myTrips} />
          {isHost ? (
            <>
              <ActionRow href="/owner" icon="home" label={t.hostDashboard} />
              <ActionRow href="/owner/bookings" icon="users" label={t.myGuests} />
            </>
          ) : (
            <ActionRow href="/owner" icon="plus" label={t.becomeHost} />
          )}

          {isHost && (
            <Card tone={profile.verified ? "default" : "warn"} className="flex flex-col gap-sm">
              <h3 className="flex items-center gap-sm font-display font-semibold">
                <Icon name="shield" className="size-5 text-turquoise-dark" />
                {t.verification}
              </h3>
              <p className="text-sm text-ink-secondary">
                {profile.verified
                  ? t.verifiedBody
                  : verificationRequest
                    ? t.verificationStatus[verificationRequest.status]
                    : t.verifyBody}
              </p>
              {!profile.verified &&
                (!verificationRequest || verificationRequest.status === "rejected") && (
                  <Link
                    href="/owner/verification"
                    className="w-fit rounded-lg bg-turquoise px-md py-1.5 text-sm font-semibold text-white hover:bg-turquoise-dark"
                  >
                    {verificationRequest ? t.resubmit : t.verifyCta}
                  </Link>
                )}
            </Card>
          )}
        </div>
      </div>

      {ratings.map((r) => (
        <Card key={r.title} className="flex flex-col gap-md">
          <h2 className="flex flex-wrap items-center gap-sm font-display text-lg font-semibold">
            <span className="text-amber-500">★</span>
            {r.avg?.toFixed(1)}
            <span className="text-ink-secondary">·</span>
            {r.title}
            <span className="text-sm font-normal text-ink-secondary">{t.reviews(r.count)}</span>
          </h2>
          <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
            {r.items.map((review, i) => (
              <div key={i} className="flex flex-col gap-xs rounded-xl bg-surface-soft p-md text-sm">
                <div className="flex items-center justify-between gap-sm">
                  <span className="font-medium">{review.name}</span>
                  <Stars n={review.stars} />
                </div>
                {review.comment && <p className="text-ink-secondary">{review.comment}</p>}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}
