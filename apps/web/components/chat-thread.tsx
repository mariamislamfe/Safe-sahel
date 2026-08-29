"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage } from "@/lib/queries/messages";

export function ChatThread({
  conversationId,
  currentUserId,
  initialMessages,
  labels = { sayHello: "Say hello 👋", placeholder: "Type a message…", send: "Send" },
  compact = false,
}: {
  conversationId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  labels?: { sayHello: string; placeholder: string; send: string };
  compact?: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            body: string;
            created_at: string;
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
                  },
                ],
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: conversationId, sender_id: currentUserId, body: draft.trim() });
    setSending(false);
    if (!error) setDraft("");
  }

  return (
    <div className={`flex flex-col ${compact ? "h-full" : "h-[70vh] rounded-xl border border-border"}`}>
      <div className="flex-1 space-y-sm overflow-y-auto p-lg">
        {messages.length === 0 && (
          <p className="text-center text-sm text-ink-secondary">{labels.sayHello}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-md py-sm text-sm ${
                  mine ? "bg-turquoise text-white" : "bg-surface-soft text-ink"
                }`}
              >
                {m.body}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="flex gap-sm border-t border-border p-md">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
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
