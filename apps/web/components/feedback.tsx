"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "@/lib/i18n/locale-provider";
import { common } from "@/lib/i18n/common";
import { Icon } from "@/components/admin/icons";

/**
 * App-wide feedback: toasts + an in-app confirm/prompt dialog that replace the
 * browser's alert()/confirm()/prompt() (which look broken on phones, can't be
 * styled or translated, and block the page).
 */

type ToastTone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: ToastTone };

type DialogOptions = {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  /** When set, the dialog shows a text field and resolves with its value. */
  input?: { label?: string; placeholder?: string; multiline?: boolean };
};
type DialogState = DialogOptions & { resolve: (v: string | null) => void };

type FeedbackApi = {
  toast: (message: string, tone?: ToastTone) => void;
  confirm: (opts: DialogOptions) => Promise<boolean>;
  prompt: (opts: DialogOptions) => Promise<string | null>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

export function useFeedback(): FeedbackApi {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error("useFeedback must be used inside <FeedbackProvider>");
  return ctx;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const seq = useRef(0);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = ++seq.current;
    setToasts((list) => [...list.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 4000);
  }, []);

  const prompt = useCallback(
    (opts: DialogOptions) =>
      new Promise<string | null>((resolve) => setDialog({ ...opts, resolve })),
    [],
  );
  const confirm = useCallback(
    async (opts: DialogOptions) => (await prompt({ ...opts, input: undefined })) !== null,
    [prompt],
  );

  return (
    <FeedbackContext.Provider value={{ toast, confirm, prompt }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-xs px-lg md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex max-w-md animate-[toast-in_.2s_ease-out] items-center gap-sm rounded-xl bg-ink px-md py-sm text-sm font-medium text-white shadow-xl"
          >
            <span
              className={`grid size-5 shrink-0 place-items-center rounded-full ${
                t.tone === "error"
                  ? "bg-red-500"
                  : t.tone === "info"
                    ? "bg-white/20"
                    : "bg-turquoise"
              }`}
            >
              <Icon
                name={t.tone === "error" ? "close" : t.tone === "info" ? "bell" : "check"}
                className="size-3"
                strokeWidth={3}
              />
            </span>
            {t.message}
          </div>
        ))}
      </div>
      {dialog && (
        <Dialog
          {...dialog}
          onClose={(v) => {
            dialog.resolve(v);
            setDialog(null);
          }}
        />
      )}
    </FeedbackContext.Provider>
  );
}

function Dialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "default",
  input,
  onClose,
}: DialogOptions & { onClose: (v: string | null) => void }) {
  const c = common[useLocale()];
  const [value, setValue] = useState("");
  const confirmRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    (input ? inputRef.current : confirmRef.current)?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose(null);
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [input, onClose]);

  const fieldCls =
    "w-full rounded-xl border border-border bg-surface px-md py-2.5 text-sm outline-none focus:border-turquoise focus:ring-2 focus:ring-turquoise/20";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dlg-title"
    >
      <button
        aria-label={c.cancel}
        className="absolute inset-0 bg-ink/50"
        onClick={() => onClose(null)}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onClose(input ? value : "");
        }}
        className="relative flex w-full max-w-md animate-[sheet-in_.2s_ease-out] flex-col gap-md rounded-t-3xl bg-surface p-lg shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-start gap-md">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-full ${
              tone === "danger"
                ? "bg-red-50 text-red-600"
                : "bg-turquoise-light text-turquoise-dark"
            }`}
          >
            <Icon name={tone === "danger" ? "alert" : "check"} />
          </span>
          <div className="flex flex-col gap-xs pt-1">
            <h2 id="dlg-title" className="font-display text-lg font-semibold leading-snug">
              {title}
            </h2>
            {body && <p className="text-sm text-ink-secondary">{body}</p>}
          </div>
        </div>
        {input && (
          <label className="flex flex-col gap-xs">
            {input.label && <span className="text-sm font-medium">{input.label}</span>}
            {input.multiline ? (
              <textarea
                ref={inputRef}
                rows={3}
                value={value}
                placeholder={input.placeholder}
                onChange={(e) => setValue(e.target.value)}
                className={fieldCls}
              />
            ) : (
              <input
                ref={inputRef}
                value={value}
                placeholder={input.placeholder}
                onChange={(e) => setValue(e.target.value)}
                className={fieldCls}
              />
            )}
          </label>
        )}
        <div className="flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => onClose(null)}
            className="rounded-xl border border-border px-lg py-2.5 text-sm font-medium text-ink-secondary hover:text-ink"
          >
            {cancelLabel ?? c.cancel}
          </button>
          <button
            ref={confirmRef}
            type="submit"
            className={`rounded-xl px-lg py-2.5 text-sm font-semibold text-white ${
              tone === "danger"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-turquoise hover:bg-turquoise-dark"
            }`}
          >
            {confirmLabel ?? c.ok}
          </button>
        </div>
      </form>
    </div>
  );
}
