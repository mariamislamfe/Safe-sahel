"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { date } from "@/lib/i18n/format";
import { notificationHref, notificationText, URGENT_KINDS } from "@/lib/notifications";
import { useFeedback } from "@/components/feedback";
import { Icon } from "@/components/admin/icons";

type Row = {
  id: string;
  kind: string;
  payload: Record<string, unknown> | null;
  created_at: string;
  read_at: string | null;
};

const strings = {
  en: { title: "Notifications", empty: "You're all caught up", markRead: "Mark all read" },
  ar: { title: "الإشعارات", empty: "مفيش إشعارات جديدة", markRead: "علّم الكل كمقروء" },
};

/**
 * Bell + dropdown fed by the `notifications` table (RLS: own rows only).
 * Polls every minute and on tab focus; a new urgent item (booking request /
 * confirmation) also pops a toast so it can't be missed.
 */
export function NotificationBell({
  align = "end",
  tone = "default",
}: {
  align?: "start" | "end";
  tone?: "default" | "light";
}) {
  const locale = useLocale();
  const t = strings[locale];
  const fb = useFeedback();
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const userId = useRef<string | null>(null);
  const seen = useRef<Set<string> | null>(null);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!userId.current) {
      const { data } = await supabase.auth.getUser();
      userId.current = data.user?.id ?? null;
    }
    if (!userId.current) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, kind, payload, created_at, read_at")
      .eq("recipient_id", userId.current)
      .order("created_at", { ascending: false })
      .limit(15);
    const list = (data ?? []) as Row[];
    if (seen.current) {
      const fresh = list.find(
        (r) => !r.read_at && !seen.current!.has(r.id) && URGENT_KINDS.has(r.kind),
      );
      if (fresh) fb.toast(notificationText(locale, fresh.kind, fresh.payload), "info");
    }
    seen.current = new Set(list.map((r) => r.id));
    setRows(list);
  }, [fb, locale]);

  useEffect(() => {
    const first = setTimeout(load, 0);
    const id = setInterval(load, 60_000);
    const onFocus = () => document.visibilityState === "visible" && load();
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(first);
      clearInterval(id);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    if (!userId.current) return;
    const now = new Date().toISOString();
    setRows((list) => list.map((r) => (r.read_at ? r : { ...r, read_at: now })));
    await createClient()
      .from("notifications")
      .update({ read_at: now })
      .eq("recipient_id", userId.current)
      .is("read_at", null);
  }

  async function markOne(id: string) {
    const now = new Date().toISOString();
    setRows((list) => list.map((r) => (r.id === id ? { ...r, read_at: now } : r)));
    setOpen(false);
    await createClient().from("notifications").update({ read_at: now }).eq("id", id);
  }

  const unread = rows.filter((r) => !r.read_at).length;

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`${t.title}${unread ? ` (${unread})` : ""}`}
        aria-expanded={open}
        className={`relative grid size-10 place-items-center rounded-full transition ${
          tone === "light"
            ? "text-white hover:bg-white/15"
            : "text-ink-secondary hover:bg-surface-soft hover:text-ink"
        }`}
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute end-1 top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute top-full z-50 mt-xs w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface text-ink shadow-2xl ${
            align === "end" ? "end-0" : "start-0"
          }`}
        >
          <div className="flex items-center justify-between gap-sm border-b border-border px-md py-sm">
            <p className="font-display font-semibold">{t.title}</p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-semibold text-turquoise-dark hover:underline"
              >
                {t.markRead}
              </button>
            )}
          </div>
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-xs px-md py-xl text-center text-sm text-ink-secondary">
              <Icon name="check" className="size-6 text-turquoise" />
              {t.empty}
            </div>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={notificationHref(r.kind, r.payload)}
                    onClick={() => markOne(r.id)}
                    className={`flex items-start gap-sm px-md py-sm text-sm transition hover:bg-surface-soft ${
                      r.read_at ? "text-ink-secondary" : ""
                    }`}
                  >
                    <span
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        r.read_at
                          ? "bg-transparent"
                          : URGENT_KINDS.has(r.kind)
                            ? "bg-red-500"
                            : "bg-turquoise"
                      }`}
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className={r.read_at ? "" : "font-medium"}>
                        {notificationText(locale, r.kind, r.payload)}
                      </span>
                      <span className="text-xs text-ink-secondary">
                        {date(locale, r.created_at)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
