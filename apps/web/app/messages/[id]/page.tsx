import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getConversationDetail, getMessages } from "@/lib/queries/messages";
import { getLocale } from "@/lib/locale";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ChatThread } from "@/components/chat-thread";

export default async function ConversationPage(props: PageProps<"/messages/[id]">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversation = await getConversationDetail(id, user.id);
  if (!conversation) notFound();

  const messages = await getMessages(id);
  const otherUserId = user.id === conversation.guestId ? conversation.ownerId : conversation.guestId;
  const t = getDictionary(await getLocale()).messenger;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-lg px-lg py-2xl">
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-xl font-bold tracking-tight">
          {conversation.otherPersonName}
        </h1>
        {conversation.propertyTitle && (
          <p className="text-sm text-ink-secondary">About {conversation.propertyTitle}</p>
        )}
        <p className="text-xs text-ink-secondary">
          No reply within 24 hours? Contact us at{" "}
          <a href="https://wa.me/201123094983" className="font-medium text-turquoise-dark">
            01123094983
          </a>
          .
        </p>
      </div>
      <ChatThread
        conversationId={id}
        currentUserId={user.id}
        otherUserId={otherUserId}
        initialMessages={messages}
        labels={{
          sayHello: t.sayHello,
          placeholder: t.placeholder,
          send: t.send,
          sent: t.sent,
          seen: t.seen,
          online: t.online,
          typing: t.typing,
        }}
      />
    </main>
  );
}
