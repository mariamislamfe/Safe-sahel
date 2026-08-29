"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Compound = { id: string; name: string; area: string | null };

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function AdminCompoundsManager({ initialCompounds }: { initialCompounds: Compound[] }) {
  const router = useRouter();
  const [compounds, setCompounds] = useState(initialCompounds);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");

  async function add() {
    if (!name.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("compounds")
      .insert({ name: name.trim(), area: area.trim() || null, slug: slugify(name) })
      .select("id, name, area")
      .single();
    if (!error && data) {
      setCompounds((prev) => [...prev, data]);
      setName("");
      setArea("");
      router.refresh();
    }
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("compounds").delete().eq("id", id);
    setCompounds((prev) => prev.filter((c) => c.id !== id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap gap-sm">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Compound name"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
        <input
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Area (optional)"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
        <button
          onClick={add}
          className="rounded-md border border-turquoise px-md py-sm text-sm font-medium text-turquoise-dark hover:bg-turquoise-light"
        >
          Add compound
        </button>
      </div>

      <ul className="flex flex-col gap-xs">
        {compounds.map((compound) => (
          <li
            key={compound.id}
            className="flex items-center justify-between rounded-md border border-border px-md py-sm text-sm"
          >
            <span>
              {compound.name}
              {compound.area && <span className="text-ink-secondary"> · {compound.area}</span>}
            </span>
            <button
              onClick={() => remove(compound.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
