import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/queries/messages";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await getConversations(user.id);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-lg py-2xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>

      {conversations.length === 0 ? (
        <div className="flex flex-col items-center gap-sm rounded-2xl border border-dashed border-border px-lg py-4xl text-center">
          <p className="font-medium text-ink">No conversations yet</p>
          <p className="max-w-sm text-sm text-ink-secondary">
            Message a host from any property page and it&apos;ll show up here.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border overflow-hidden rounded-xl border border-border">
          {conversations.map((c) => (
            <Link
              key={c.id}
              href={`/messages/${c.id}`}
              className="flex flex-col gap-1 p-lg hover:bg-surface-soft"
            >
              <p className="font-medium text-ink">{c.otherPersonName}</p>
              {c.propertyTitle && <p className="text-sm text-ink-secondary">{c.propertyTitle}</p>}
              <p className="text-xs text-ink-secondary">
                {new Date(c.lastMessageAt).toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
