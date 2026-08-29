"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/queries/messages";

const TYPING_BROADCAST_THROTTLE_MS = 2000;
const TYPING_INDICATOR_TIMEOUT_MS = 3500;

function CheckIcon({ double }: { double?: boolean }) {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden className="inline-block">
      <path d="M1 5l3 3 5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      {double && (
        <path d="M5 5l3 3 5-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function ChatThread({
  conversationId,
  currentUserId,
  otherUserId,
  initialMessages,
  labels = {
    sayHello: "Say hello 👋",
    placeholder: "Type a message…",
    send: "Send",
    sent: "Sent",
    seen: "Seen",
    online: "Online",
    typing: "Typing…",
  },
  compact = false,
}: {
  conversationId: string;
  currentUserId: string;
  otherUserId: string;
  initialMessages: ChatMessage[];
  labels?: {
    sayHello: string;
    placeholder: string;
    send: string;
    sent: string;
    seen: string;
    online: string;
    typing: string;
  };
  compact?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTypingBroadcastRef = useRef(0);
  const typingClearTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const supabase = createClient();
      await supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", ids);
    },
    [],
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            body: string;
            created_at: string;
            read_at: string | null;
          };
          setMessages((prev) =>
            prev.some((m) => m.id === row.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: row.id,
                    conversationId: row.conversation_id,
                    senderId: row.sender_id,
                    body: row.body,
                    createdAt: row.created_at,
                    readAt: row.read_at,
                  },
                ],
          );
          if (row.sender_id === otherUserId) {
            setOtherTyping(false);
            void markRead([row.id]);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = payload.new as { id: string; read_at: string | null };
          setMessages((prev) => prev.map((m) => (m.id === row.id ? { ...m, readAt: row.read_at } : m)));
        },
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.userId !== otherUserId) return;
        setOtherTyping(true);
        if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
        typingClearTimeoutRef.current = setTimeout(() => setOtherTyping(false), TYPING_INDICATOR_TIMEOUT_MS);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{ user_id: string }>();
        const online = Object.values(state).some((entries) =>
          entries.some((e) => e.user_id === otherUserId),
        );
        setOtherOnline(online);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: currentUserId });
        }
      });

    channelRef.current = channel;

    return () => {
      if (typingClearTimeoutRef.current) clearTimeout(typingClearTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [conversationId, currentUserId, otherUserId, markRead]);

  // Mark any already-loaded messages from the other person as read once the
  // thread is open (covers the initial page load / widget open, not just
  // messages that arrive afterward).
  useEffect(() => {
    const unread = messages.filter((m) => m.senderId === otherUserId && !m.readAt).map((m) => m.id);
    if (unread.length > 0) void markRead(unread);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  function broadcastTyping() {
    const now = Date.now();
    if (now - lastTypingBroadcastRef.current < TYPING_BROADCAST_THROTTLE_MS) return;
    lastTypingBroadcastRef.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: draft.trim() })
      .select("id, conversation_id, sender_id, body, created_at, read_at")
      .single();
    setSending(false);
    if (error || !data) return;

    // Add it locally right away instead of waiting on the realtime echo —
    // on a brand new conversation the channel can still be mid-subscribe
    // when the first message is sent, so that echo never arrives and the
    // message silently doesn't show up until a second one is sent (or the
    // page is refreshed). The INSERT handler above dedupes by id, so this
    // never double-adds once the echo does arrive.
    setMessages((prev) =>
      prev.some((m) => m.id === data.id)
        ? prev
        : [
            ...prev,
            {
              id: data.id,
              conversationId: data.conversation_id,
              senderId: data.sender_id,
              body: data.body,
              createdAt: data.created_at,
              readAt: data.read_at,
            },
          ],
    );
    setDraft("");
  }

  const statusLabel = useMemo(() => {
    if (otherTyping) return labels.typing;
    if (otherOnline) return labels.online;
    return null;
  }, [otherTyping, otherOnline, labels]);

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "h-[70vh] rounded-xl border border-border"}`}>
      {statusLabel && (
        <div className="border-b border-border px-lg py-xs text-xs">
          <span className={otherTyping ? "text-turquoise-dark" : "text-turquoise"}>● {statusLabel}</span>
        </div>
      )}
      <div className="flex-1 space-y-sm overflow-y-auto p-lg">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-secondary">{labels.sayHello}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className="flex max-w-[75%] flex-col gap-0.5">
                <div
                  className={`rounded-2xl px-md py-sm text-sm ${
                    mine ? "bg-turquoise text-white" : "bg-surface-soft text-ink"
                  }`}
                >
                  {m.body}
                </div>
                {mine && (
                  <span className={`self-end text-[10px] ${m.readAt ? "text-turquoise-dark" : "text-ink-secondary"}`}>
                    <CheckIcon double={!!m.readAt} /> {m.readAt ? labels.seen : labels.sent}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-sm border-t border-border p-md">
        <input
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            broadcastTyping();
          }}
          placeholder={labels.placeholder}
          className="flex-1 rounded-full border border-border bg-surface px-lg py-sm text-sm outline-none focus:border-turquoise"
        />
        <button
          type="submit"
          disabled={sending}
          className="rounded-full bg-turquoise px-lg py-sm text-sm font-semibold text-white hover:bg-turquoise-dark disabled:opacity-60"
        >
          {labels.send}
        </button>
      </form>
    </div>
  );
}
