import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminDict } from "@/lib/i18n/admin";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { date } from "@/lib/i18n/format";
import { canAccess, hasPermission, requireSection, ADMIN_SECTIONS } from "@/lib/admin-access";
import { getQueueCounts } from "@/lib/queries/admin";
import { getPlatformSetting } from "@/lib/queries/owner-dashboard";
import { Icon, type IconName } from "@/components/admin/icons";
import { Card, EmptyState, PageHeader, Section, StatCard } from "@/components/admin/ui";

type Task = {
  label: string;
  count: number;
  href: string;
  icon: IconName;
  note?: string | null;
  urgent?: boolean;
};

export default async function AdminOverviewPage(props: PageProps<"/admin">) {
  const params = await props.searchParams;
  const access = await requireSection("overview");
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminDict[locale].overview;
  const s = adminShellDict[locale];
  const nav = adminDict[locale].nav;
  const can = (p: Parameters<typeof hasPermission>[1]) => hasPermission(access, p);

  if (can("bookings")) await supabase.rpc("expire_stale_bookings");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const head = { count: "exact" as const, head: true };
  const none = Promise.resolve({ data: null, count: null });

  const [counts, { data: me }, guarantee, live, owners, users, bookings, target] =
    await Promise.all([
      getQueueCounts(access),
      supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
      can("payments") ? supabase.rpc("guarantee_status") : Promise.resolve({ data: null }),
      supabase
        .from("properties")
        .select("*", head)
        .eq("status", "published")
        .is("deleted_at", null),
      can("users")
        ? supabase.from("profiles").select("*", head).in("role", ["owner", "admin"])
        : none,
      can("users") ? supabase.from("profiles").select("*", head) : none,
      can("bookings") ? supabase.from("bookings").select("*", head) : none,
      getPlatformSetting<{ total: number; milestones: { date: string; count: number }[] }>(
        "verified_target",
        { total: 100, milestones: [] },
      ),
    ]);
  const guaranteeEligible = (guarantee.data ?? []).filter(
    (g: { status: string }) => g.status === "eligible",
  ).length;

  const tasks: Task[] = [];
  if (can("verification")) {
    tasks.push({
      label: t.verifications,
      count: counts.verifications,
      href: "/admin/verification",
      icon: "shield",
      note:
        counts.oldestVerificationHours !== null ? t.oldest(counts.oldestVerificationHours) : null,
      urgent: counts.verificationOverdue,
    });
    tasks.push({
      label: t.authorizations,
      count: counts.authorizations,
      href: "/admin/verification",
      icon: "clipboard",
    });
  }
  if (can("payments")) {
    tasks.push({
      label: t.payments,
      count: counts.payments,
      href: "/admin/payments",
      icon: "card",
    });
    tasks.push({
      label: t.guarantee,
      count: guaranteeEligible,
      href: "/admin/guarantee",
      icon: "gift",
    });
    tasks.push({
      label: t.expiring,
      count: counts.expiring,
      href: "/admin/subscriptions?f=expiring",
      icon: "repeat",
    });
  }
  if (can("listings")) {
    tasks.push({
      label: t.flagged,
      count: counts.flagged,
      href: "/admin/properties?f=flagged",
      icon: "alert",
      urgent: counts.flagged > 0,
    });
    tasks.push({
      label: t.duplicates,
      count: counts.duplicates,
      href: "/admin/properties?f=duplicates",
      icon: "building",
    });
  }
  if (can("bookings")) {
    tasks.push({
      label: t.pendingBookings,
      count: counts.pendingBookings,
      href: "/admin/bookings?f=pending",
      icon: "calendar",
    });
  }
  const open = tasks
    .filter((x) => x.count > 0)
    .sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent) || b.count - a.count);

  const liveCount = live.count ?? 0;
  const pct = Math.min(100, Math.round((liveCount / Math.max(target.total, 1)) * 100));
  const today = new Date().toISOString().slice(0, 10);
  const nextMilestone = target.milestones.find((m) => m.date >= today);

  const shortcuts = ADMIN_SECTIONS.filter(
    (sec) => sec.key !== "overview" && canAccess(access, sec.requires),
  ).slice(0, 8);
  const labels: Record<string, string> = { ...nav, team: s.nav.team };

  return (
    <>
      {params.denied && (
        <div className="flex items-start gap-sm rounded-xl border border-amber-200 bg-amber-50 px-md py-sm text-sm text-amber-900">
          <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
          {s.denied}
        </div>
      )}
      <PageHeader
        title={s.overview.greeting(me?.full_name?.split(" ")[0] ?? "")}
        description={date(locale, new Date().toISOString())}
      />

      <Section title={s.overview.attention} description={s.overview.attentionHint}>
        {open.length === 0 ? (
          <EmptyState icon="check" title={s.overview.allClear} body={s.overview.allClearBody} />
        ) : (
          <div className="grid grid-cols-1 gap-sm md:grid-cols-2">
            {open.map((task) => (
              <Link
                key={task.label}
                href={task.href}
                className={`group flex items-center gap-md rounded-2xl border bg-surface p-md shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:shadow-md ${
                  task.urgent
                    ? "border-red-200 hover:border-red-300"
                    : "border-border hover:border-turquoise"
                }`}
              >
                <span
                  className={`grid size-11 shrink-0 place-items-center rounded-xl ${
                    task.urgent
                      ? "bg-red-50 text-red-600"
                      : "bg-turquoise-light text-turquoise-dark"
                  }`}
                >
                  <Icon name={task.icon} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{task.label}</span>
                  {task.note && (
                    <span
                      className={`text-xs ${task.urgent ? "font-semibold text-red-600" : "text-ink-secondary"}`}
                    >
                      {task.urgent && `${s.overview.overdue} · `}
                      {task.note}
                    </span>
                  )}
                </span>
                <span className="font-display text-2xl font-bold tabular-nums">{task.count}</span>
                <Icon
                  name="arrow"
                  className="size-4 text-ink-secondary transition group-hover:translate-x-0.5 rtl:-scale-x-100 rtl:group-hover:-translate-x-0.5"
                />
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title={s.overview.glance}>
        <div className="grid grid-cols-2 gap-sm lg:grid-cols-4">
          <StatCard
            label={t.live}
            value={liveCount}
            icon="building"
            href={can("listings") ? "/admin/properties?f=live" : undefined}
            tone="accent"
          />
          {can("users") && (
            <>
              <StatCard
                label={t.owners}
                value={owners.count ?? 0}
                icon="users"
                href="/admin/users?r=owner"
              />
              <StatCard label={t.users} value={users.count ?? 0} icon="users" href="/admin/users" />
            </>
          )}
          {can("bookings") && (
            <StatCard
              label={t.bookings}
              value={bookings.count ?? 0}
              icon="calendar"
              href="/admin/bookings"
            />
          )}
        </div>
      </Section>

      {can("reports") && (
        <Card>
          <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <p className="text-sm text-ink-secondary">{s.overview.target}</p>
              <p className="font-display text-3xl font-bold tabular-nums">
                {s.overview.targetOf(liveCount, target.total)}
              </p>
              {nextMilestone && (
                <p className="text-xs text-ink-secondary">
                  {date(locale, nextMilestone.date)} → {nextMilestone.count}
                </p>
              )}
            </div>
            <Link
              href="/admin/targets"
              className="text-sm font-medium text-turquoise-dark hover:underline"
            >
              {s.overview.open} →
            </Link>
          </div>
          <div className="mt-md h-2.5 overflow-hidden rounded-full bg-surface-soft">
            <div className="h-full rounded-full bg-turquoise" style={{ width: `${pct}%` }} />
          </div>
        </Card>
      )}

      {shortcuts.length > 0 && (
        <Section title={s.overview.shortcuts}>
          <div className="grid grid-cols-2 gap-sm sm:grid-cols-4">
            {shortcuts.map((sec) => (
              <Link
                key={sec.key}
                href={sec.href}
                className="flex items-center gap-sm rounded-xl border border-border bg-surface px-md py-sm text-sm font-medium transition hover:border-turquoise hover:text-turquoise-dark"
              >
                <Icon name={sec.icon} className="size-4 shrink-0 text-ink-secondary" />
                <span className="truncate">{labels[sec.key]}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
