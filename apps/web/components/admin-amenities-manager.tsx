"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Amenity = { id: string; name: string; category: string | null };

export function AdminAmenitiesManager({ initialAmenities }: { initialAmenities: Amenity[] }) {
  const router = useRouter();
  const [amenities, setAmenities] = useState(initialAmenities);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  async function add() {
    if (!name.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("amenities")
      .insert({ name: name.trim(), category: category.trim() || null })
      .select("id, name, category")
      .single();
    if (!error && data) {
      setAmenities((prev) => [...prev, data]);
      setName("");
      setCategory("");
      router.refresh();
    }
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("amenities").delete().eq("id", id);
    setAmenities((prev) => prev.filter((a) => a.id !== id));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap gap-sm">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Amenity name"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (optional)"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
        <button
          onClick={add}
          className="rounded-md border border-turquoise px-md py-sm text-sm font-medium text-turquoise-dark hover:bg-turquoise-light"
        >
          Add amenity
        </button>
      </div>

      <ul className="flex flex-col gap-xs">
        {amenities.map((amenity) => (
          <li
            key={amenity.id}
            className="flex items-center justify-between rounded-md border border-border px-md py-sm text-sm"
          >
            <span>
              {amenity.name}
              {amenity.category && (
                <span className="text-ink-secondary"> · {amenity.category}</span>
              )}
            </span>
            <button
              onClick={() => remove(amenity.id)}
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
