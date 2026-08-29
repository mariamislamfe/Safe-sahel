"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Locale } from "@safe-sahel/types";
import { useCurrentProfile } from "@/lib/hooks/use-current-profile";
import { createClient } from "@/lib/supabase/client";
import { getDictionary } from "@/lib/i18n/dictionary";
import { ChatThread } from "@/components/chat-thread";
import type { ChatMessage } from "@/lib/queries/messages";

type ConversationRow = {
  id: string;
  otherPersonId: string;
  otherPersonName: string;
  propertyTitle: string | null;
  lastMessageAt: string;
  unread: boolean;
};

function ChatBubbleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3.5 11c0-4.14 3.8-7.5 8.5-7.5s8.5 3.36 8.5 7.5-3.8 7.5-8.5 7.5c-1 0-1.96-.15-2.85-.44L4 20l1.15-3.55A7.14 7.14 0 013.5 11z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MessengerWidget({ locale }: { locale: Locale }) {
  const { profile } = useCurrentProfile();
  const t = getDictionary(locale).messenger;
  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationRow[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [activeTitle, setActiveTitle] = useState<string>("");
  const [activeOtherUserId, setActiveOtherUserId] = useState<string>("");

  const loadConversations = useCallback(async () => {
    if (!profile) return;
    const supabase = createClient();

    const { data: rows } = await supabase
      .from("conversations")
      .select("id, property_id, guest_id, owner_id, last_message_at")
      .or(`guest_id.eq.${profile.id},owner_id.eq.${profile.id}`)
      .order("last_message_at", { ascending: false });

    if (!rows || rows.length === 0) {
      setConversations([]);
      return;
    }

    const otherIds = rows.map((c) => (c.guest_id === profile.id ? c.owner_id : c.guest_id));
    const propertyIds = rows.map((c) => c.property_id).filter((id): id is string => !!id);
    const conversationIds = rows.map((c) => c.id);

    const [{ data: profiles }, { data: properties }, { data: unreadMessages }] = await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", otherIds),
      propertyIds.length > 0
        ? supabase.from("properties").select("id, title").in("id", propertyIds)
        : Promise.resolve({ data: [] as { id: string; title: string }[] }),
      supabase
        .from("messages")
        .select("conversation_id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", profile.id)
        .is("read_at", null),
    ]);

    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const titleById = new Map((properties ?? []).map((p) => [p.id, p.title]));
    const unreadConversationIds = new Set((unreadMessages ?? []).map((m) => m.conversation_id));

    setConversations(
      rows.map((c) => {
        const otherId = c.guest_id === profile.id ? c.owner_id : c.guest_id;
        return {
          id: c.id,
          otherPersonId: otherId,
          otherPersonName: nameById.get(otherId) ?? "Safe Sahel user",
          propertyTitle: c.property_id ? (titleById.get(c.property_id) ?? null) : null,
          lastMessageAt: c.last_message_at,
          unread: unreadConversationIds.has(c.id),
        };
      }),
    );
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    // Deferred to a microtask — calling loadConversations() (which setStates)
    // directly and synchronously in the effect body trips
    // react-hooks/set-state-in-effect (same pattern as use-current-profile.ts).
    Promise.resolve().then(loadConversations);

    // Only poll the list while looking at the list itself — while a thread
    // is open, refetching every 45s could reorder/replace the conversation
    // row out from under the user mid-chat (realtime already keeps the open
    // thread itself live, so there's nothing this poll would add there).
    if (activeId) return;
    const interval = setInterval(() => void loadConversations(), 45_000);
    return () => clearInterval(interval);
  }, [profile, loadConversations, activeId]);

  useEffect(() => {
    if (open) Promise.resolve().then(loadConversations);
  }, [open, loadConversations]);

  async function openConversation(conversation: ConversationRow) {
    setActiveId(conversation.id);
    setActiveTitle(conversation.otherPersonName);
    setActiveOtherUserId(conversation.otherPersonId);
    const supabase = createClient();

    const { data: messages } = await supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    setActiveMessages(
      (messages ?? []).map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderId: m.sender_id,
        body: m.body,
        createdAt: m.created_at,
        readAt: m.read_at,
      })),
    );

    // ChatThread marks unread messages read itself on mount — just reflect
    // that in the list's badge right away instead of waiting on a refetch.
    setConversations((prev) =>
      prev ? prev.map((c) => (c.id === conversation.id ? { ...c, unread: false } : c)) : prev,
    );
  }

  if (!profile) return null;

  const unreadTotal = conversations?.filter((c) => c.unread).length ?? 0;

  return (
    <div className="fixed bottom-lg end-lg z-40 flex flex-col items-end gap-sm">
      {open && (
        <div className="flex h-[28rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xl sm:w-96">
          <div className="flex items-center gap-sm border-b border-border px-lg py-md">
            {activeId ? (
              <button
                type="button"
                onClick={() => {
                  setActiveId(null);
                  void loadConversations();
                }}
                className="text-ink-secondary hover:text-ink"
                aria-label="Back"
              >
                ‹
              </button>
            ) : null}
            <p className="flex-1 truncate font-display text-sm font-semibold text-ink">
              {activeId ? activeTitle : t.title}
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-lg leading-none text-ink-secondary hover:text-ink"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {activeId ? (
            <div className="flex-1 overflow-hidden">
              <ChatThread
                conversationId={activeId}
                currentUserId={profile.id}
                otherUserId={activeOtherUserId}
                initialMessages={activeMessages}
                labels={{
                  sayHello: t.sayHello,
                  placeholder: t.placeholder,
                  send: t.send,
                  sent: t.sent,
                  seen: t.seen,
                  online: t.online,
                  typing: t.typing,
                }}
                compact
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col overflow-y-auto">
              {conversations === null ? null : conversations.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-xs px-lg text-center">
                  <p className="text-sm font-medium text-ink">{t.emptyTitle}</p>
                  <p className="text-xs text-ink-secondary">{t.emptyBody}</p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-border">
                  {conversations.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => openConversation(c)}
                      className="flex flex-col gap-0.5 px-lg py-md text-start hover:bg-surface-soft"
                    >
                      <span className="flex items-center gap-sm font-medium text-ink">
                        {c.unread && <span className="size-1.5 shrink-0 rounded-full bg-turquoise" />}
                        {c.otherPersonName}
                      </span>
                      {c.propertyTitle && (
                        <span className="text-xs text-ink-secondary">{c.propertyTitle}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <Link
                href="/messages"
                onClick={() => setOpen(false)}
                className="border-t border-border px-lg py-sm text-center text-xs font-medium text-turquoise-dark hover:text-turquoise-dark/80"
              >
                {t.viewAll}
              </Link>
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex size-14 items-center justify-center rounded-full bg-turquoise text-white shadow-lg transition-colors hover:bg-turquoise-dark"
        aria-label={t.title}
      >
        <ChatBubbleIcon />
        {!open && unreadTotal > 0 && (
          <span className="absolute -top-1 -end-1 flex size-5 items-center justify-center rounded-full bg-butter text-[11px] font-bold text-ink">
            {unreadTotal}
          </span>
        )}
      </button>
    </div>
  );
}
