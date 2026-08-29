import { createClient } from "@/lib/supabase/server";

const roleStyles: Record<string, string> = {
  guest: "bg-surface-soft text-ink-secondary",
  owner: "bg-turquoise-light text-turquoise-dark",
  admin: "bg-butter-soft text-ink",
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, role, locale, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-soft text-left text-ink-secondary">
            <tr>
              <th className="p-md">Name</th>
              <th className="p-md">Role</th>
              <th className="p-md">Joined</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((user) => (
              <tr key={user.id} className="border-t border-border">
                <td className="p-md font-medium text-ink">{user.full_name ?? "—"}</td>
                <td className="p-md">
                  <span
                    className={`rounded-full px-sm py-xs text-xs font-medium capitalize ${roleStyles[user.role]}`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="p-md text-ink-secondary">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
