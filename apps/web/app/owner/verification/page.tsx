import { redirect } from "next/navigation";
import { daysSince } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { getLatestVerification, getOwnerProfile } from "@/lib/queries/owner-dashboard";
import { VerificationForm } from "@/components/verification-form";

export default async function OwnerVerificationPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = ownerDict[locale].verification;
  const c = common[locale];
  const [profile, latest] = await Promise.all([
    getOwnerProfile(user.id),
    getLatestVerification(user.id),
  ]);

  const badges = [
    profile.verified && profile.hostType !== "broker" && c.badges.verifiedOwner,
    profile.verified && profile.hostType === "broker" && c.badges.approvedBroker,
    profile.founding && c.badges.foundingHost,
  ].filter(Boolean) as string[];

  const ago = latest ? daysSince(latest.created_at) : null;
  const pending = latest && (latest.status === "pending" || latest.status === "contacted");
  const showForm = !profile.verified && !pending;

  return (
    <div className="flex max-w-2xl flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">{t.title}</h1>
        <p className="text-sm text-ink-secondary">{t.intro}</p>
      </div>

      <section className="flex flex-col gap-sm rounded-2xl border border-border p-lg">
        <h2 className="font-display font-semibold">{t.statusTitle}</h2>
        {profile.revokedAt && !profile.verified ? (
          <p className="text-sm text-red-700">{t.revoked(profile.revokedReason ?? "—")}</p>
        ) : profile.verified ? (
          <p className="text-sm text-turquoise-dark">✓ {t.approved(profile.legalName ?? "—")}</p>
        ) : !latest ? (
          <p className="text-sm text-ink-secondary">{t.none}</p>
        ) : pending ? (
          <p className="text-sm text-ink">⏳ {t.pending(c.daysAgo(ago ?? 0))}</p>
        ) : latest.status === "rejected" ? (
          <p className="text-sm text-red-700">{t.rejected(latest.rejection_reason ?? "—")}</p>
        ) : null}
      </section>

      <section className="flex flex-col gap-sm rounded-2xl border border-border p-lg">
        <h2 className="font-display font-semibold">{t.badgesTitle}</h2>
        {badges.length === 0 ? (
          <p className="text-sm text-ink-secondary">{t.noBadges}</p>
        ) : (
          <div className="flex flex-wrap gap-sm">
            {badges.map((b) => (
              <span
                key={b}
                className="rounded-full bg-butter px-md py-xs text-sm font-semibold text-ink"
              >
                ✓ {b}
              </span>
            ))}
          </div>
        )}
      </section>

      {showForm && (
        <section className="flex flex-col gap-md rounded-2xl border border-border p-lg">
          <h2 className="font-display font-semibold">{latest ? t.resubmit : t.formTitle}</h2>
          <VerificationForm
            profileId={user.id}
            defaultFullName={profile.legalName ?? profile.fullName ?? ""}
            defaultPhone={profile.phone ?? ""}
          />
        </section>
      )}
    </div>
  );
}
