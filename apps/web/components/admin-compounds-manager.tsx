"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { errorText } from "@/lib/i18n/common";
import { btn } from "@/components/admin-actions";

type Compound = {
  id: string;
  name: string;
  name_ar: string | null;
  area: string | null;
  hidden: boolean;
  is_focus: boolean;
};

function slugify(name: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  // Arabic-only names slugify to "" — fall back to a short random slug.
  return base || `compound-${Math.random().toString(36).slice(2, 8)}`;
}

const input =
  "min-w-0 flex-1 rounded-lg border border-border bg-surface px-md py-2 text-sm outline-none focus:border-turquoise";

export function AdminCompoundsManager({ initialCompounds }: { initialCompounds: Compound[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = adminShellDict[locale].catalog;
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await createClient()
      .from("compounds")
      .insert({ name: name.trim(), area: area.trim() || null, slug: slugify(name) });
    setBusy(false);
    if (err) return setError(errorText(locale, rpcErrorCode(err.message)));
    setName("");
    setArea("");
    router.refresh();
  }

  async function setHidden(id: string, hidden: boolean) {
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().rpc("admin_set_compound_hidden", {
      p_compound_id: id,
      p_hidden: hidden,
    });
    setBusy(false);
    if (err) return setError(errorText(locale, rpcErrorCode(err.message)));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-md">
      <form
        onSubmit={add}
        className="flex flex-col gap-sm rounded-2xl border border-border bg-surface p-md sm:flex-row"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t.name}
          className={input}
        />
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder={t.area}
          className={input}
        />
        <button disabled={busy || !name.trim()} className={btn.primary}>
          + {t.add}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialCompounds.length === 0 ? (
        <p className="text-sm text-ink-secondary">{t.empty}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-sm md:grid-cols-2">
          {initialCompounds.map((c) => (
            <li
              key={c.id}
              className={`flex items-center justify-between gap-sm rounded-xl border border-border bg-surface px-md py-sm ${c.hidden ? "opacity-60" : ""}`}
            >
              <span className="flex min-w-0 flex-col">
                <span className="flex items-center gap-xs truncate font-medium">
                  {c.is_focus && <span className="text-amber-500">★</span>}
                  {locale === "ar" && c.name_ar ? c.name_ar : c.name}
                  {c.hidden && (
                    <span className="rounded-full bg-surface-soft px-sm text-[11px] text-ink-secondary">
                      {t.hidden}
                    </span>
                  )}
                </span>
                {c.area && <span className="text-xs text-ink-secondary">{c.area}</span>}
              </span>
              <button
                disabled={busy}
                onClick={() => setHidden(c.id, !c.hidden)}
                className={c.hidden ? btn.small : btn.smallDanger}
              >
                {c.hidden ? t.unhide : t.hide}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
