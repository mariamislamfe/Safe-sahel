import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { common } from "@/lib/i18n/common";
import { date } from "@/lib/i18n/format";
import { requireSection } from "@/lib/admin-access";
import {
  Avatar,
  EmptyState,
  FilterTabs,
  PageHeader,
  Pill,
  Table,
  Td,
  Th,
  Tr,
  type PillTone,
} from "@/components/admin/ui";

const ROLES = ["all", "guest", "owner", "admin"] as const;
const ROLE_TONE: Record<string, PillTone> = { guest: "neutral", owner: "success", admin: "info" };

export default async function AdminUsersPage(props: PageProps<"/admin/users">) {
  await requireSection("users");
  const params = await props.searchParams;
  const role = (ROLES as readonly string[]).includes(String(params.r)) ? String(params.r) : "all";
  const q = typeof params.q === "string" ? params.q.trim() : "";
  const supabase = await createClient();
  const locale = await getLocale();
  const t = adminShellDict[locale].users;
  const c = common[locale];

  let query = supabase
    .from("profiles")
    .select("id, full_name, legal_name, phone, role, verified, host_type, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (q) query = query.ilike("full_name", `%${q.replace(/[%_]/g, "")}%`);
  const { data: users } = await query;
  const all = users ?? [];
  const rows = role === "all" ? all : all.filter((u) => u.role === role);
  const href = (r: string) => `/admin/users?r=${r}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader title={t.title} description={t.body} count={all.length} />
      <div className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          items={ROLES.map((r) => ({
            href: href(r),
            label: r === "all" ? t.all : t.roles[r]!,
            active: role === r,
            count: r === "all" ? all.length : all.filter((u) => u.role === r).length,
          }))}
        />
        <form action="/admin/users" className="flex gap-xs">
          <input type="hidden" name="r" value={role} />
          <input
            name="q"
            defaultValue={q}
            placeholder={t.search}
            className="w-full rounded-lg border border-border bg-surface px-md py-2 text-sm outline-none focus:border-turquoise sm:w-64"
          />
        </form>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="users" title={t.empty} />
      ) : (
        <Table minWidth={600}>
          <thead>
            <tr>
              <Th>{t.name}</Th>
              <Th>{t.role}</Th>
              <Th>{t.verified}</Th>
              <Th end>{t.joined}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <Tr key={u.id}>
                <Td>
                  <div className="flex items-center gap-sm">
                    <Avatar name={u.full_name} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{u.full_name ?? "—"}</span>
                      {u.phone && (
                        <span className="text-xs text-ink-secondary" dir="ltr">
                          {u.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </Td>
                <Td>
                  <Pill tone={ROLE_TONE[u.role] ?? "neutral"}>{t.roles[u.role] ?? u.role}</Pill>
                </Td>
                <Td>
                  {u.verified ? (
                    <Pill tone="success">
                      ✓{" "}
                      {u.host_type === "broker" ? c.badges.approvedBroker : c.badges.verifiedOwner}
                    </Pill>
                  ) : (
                    <span className="text-xs text-ink-secondary">—</span>
                  )}
                </Td>
                <Td end className="whitespace-nowrap text-ink-secondary">
                  {date(locale, u.created_at)}
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
