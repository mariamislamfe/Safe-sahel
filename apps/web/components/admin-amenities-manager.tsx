"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { rpcErrorCode } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";
import { useLocale } from "@/lib/i18n/locale-provider";
import { adminShellDict } from "@/lib/i18n/admin-shell";
import { errorText } from "@/lib/i18n/common";
import { btn } from "@/components/admin-actions";

type Amenity = { id: string; name: string; category: string | null };

const input =
  "min-w-0 flex-1 rounded-lg border border-border bg-surface px-md py-2 text-sm outline-none focus:border-turquoise";

export function AdminAmenitiesManager({ initialAmenities }: { initialAmenities: Amenity[] }) {
  const router = useRouter();
  const locale = useLocale();
  const t = adminShellDict[locale].catalog;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    const { error: err } = await createClient()
      .from("amenities")
      .insert({ name: name.trim(), category: category.trim() || null });
    setBusy(false);
    if (err) return setError(errorText(locale, rpcErrorCode(err.message)));
    setName("");
    setCategory("");
    router.refresh();
  }

  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const { error: err } = await createClient().from("amenities").delete().eq("id", id);
    setBusy(false);
    if (err) return setError(errorText(locale, rpcErrorCode(err.message)));
    router.refresh();
  }

  const groups = new Map<string, Amenity[]>();
  for (const a of initialAmenities) {
    const key = a.category ?? "—";
    groups.set(key, [...(groups.get(key) ?? []), a]);
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
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder={t.category}
          className={input}
        />
        <button disabled={busy || !name.trim()} className={btn.primary}>
          + {t.add}
        </button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {initialAmenities.length === 0 ? (
        <p className="text-sm text-ink-secondary">{t.empty}</p>
      ) : (
        [...groups.entries()].map(([category, items]) => (
          <div key={category} className="flex flex-col gap-xs">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-secondary">
              {category}
            </p>
            <div className="flex flex-wrap gap-xs">
              {items.map((a) => (
                <span
                  key={a.id}
                  className="group inline-flex items-center gap-xs rounded-full border border-border bg-surface py-1 pe-1 ps-md text-sm"
                >
                  {a.name}
                  <button
                    disabled={busy}
                    onClick={() => remove(a.id)}
                    aria-label={t.remove}
                    title={t.remove}
                    className="grid size-6 place-items-center rounded-full text-ink-secondary hover:bg-red-50 hover:text-red-600"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
