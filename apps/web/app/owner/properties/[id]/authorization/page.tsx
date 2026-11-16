import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { ownerDict } from "@/lib/i18n/owner";
import { common } from "@/lib/i18n/common";
import { date } from "@/lib/i18n/format";
import { getOwnerProfile } from "@/lib/queries/owner-dashboard";
import { BrokerAuthorizationForm } from "@/components/broker-authorization-form";

export default async function BrokerAuthorizationPage(
  props: PageProps<"/owner/properties/[id]/authorization">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: property } = await supabase
    .from("properties")
    .select("id, title, owner_id")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();
  if (!property) notFound();

  const locale = await getLocale();
  const t = ownerDict[locale].authorization;
  const c = common[locale];
  const profile = await getOwnerProfile(user.id);
  const { data: history } = await supabase
    .from("broker_authorizations")
    .select("id, owner_full_name, status, rejection_reason, created_at")
    .eq("property_id", id)
    .order("created_at", { ascending: false });

  const hasActive = (history ?? []).some((h) => h.status === "pending" || h.status === "approved");

  return (
    <div className="flex max-w-xl flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">
          {t.title} · {property.title}
        </h1>
        <p className="text-sm text-ink-secondary">
          {profile.hostType === "broker" ? t.intro : t.onlyBrokers}
        </p>
      </div>

      {(history ?? []).length > 0 && (
        <section className="flex flex-col gap-sm">
          <h2 className="font-display font-semibold">{t.history}</h2>
          <ul className="flex flex-col gap-xs">
            {(history ?? []).map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-sm rounded-lg border border-border px-md py-sm text-sm"
              >
                <span>
                  {h.owner_full_name} · {date(locale, h.created_at)}
                  {h.status === "rejected" && h.rejection_reason && (
                    <span className="block text-xs text-red-700">{h.rejection_reason}</span>
                  )}
                </span>
                <span className="text-xs font-medium">{c.reviewStatus[h.status]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {profile.hostType === "broker" && !hasActive && (
        <BrokerAuthorizationForm propertyId={id} brokerId={user.id} />
      )}
    </div>
  );
}
