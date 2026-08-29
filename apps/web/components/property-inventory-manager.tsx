"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";

type Item = { id: string; name: string; quantity: number; photoUrl: string | null };
type Category = { id: string; name: string; items: Item[] };

export function PropertyInventoryManager({
  ownerId,
  propertyId,
  initialCategories,
}: {
  ownerId: string;
  propertyId: string;
  initialCategories: Category[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function addCategory() {
    if (!newCategoryName.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("property_inventory_categories")
      .insert({
        property_id: propertyId,
        name: newCategoryName.trim(),
        sort_order: categories.length,
      })
      .select("id, name")
      .single();
    if (!error && data) {
      setCategories((prev) => [...prev, { id: data.id, name: data.name, items: [] }]);
      setNewCategoryName("");
    }
  }

  async function removeCategory(id: string) {
    const supabase = createClient();
    await supabase.from("property_inventory_categories").delete().eq("id", id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function addItem(categoryId: string, name: string, quantity: number) {
    if (!name.trim()) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("property_inventory_items")
      .insert({ category_id: categoryId, name: name.trim(), quantity })
      .select("id, name, quantity, photo_url")
      .single();
    if (!error && data) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === categoryId
            ? {
                ...c,
                items: [
                  ...c.items,
                  { id: data.id, name: data.name, quantity: data.quantity, photoUrl: data.photo_url },
                ],
              }
            : c,
        ),
      );
    }
  }

  async function removeItem(categoryId: string, itemId: string) {
    const supabase = createClient();
    await supabase.from("property_inventory_items").delete().eq("id", itemId);
    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c,
      ),
    );
  }

  async function uploadPhoto(categoryId: string, itemId: string, file: File) {
    setUploadingItemId(itemId);
    const supabase = createClient();

    const path = `${ownerId}/${propertyId}/${itemId}-${crypto.randomUUID()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from("inventory-photos").upload(path, file);
    if (uploadError) {
      setUploadingItemId(null);
      return;
    }
    const url = supabase.storage.from("inventory-photos").getPublicUrl(path).data.publicUrl;

    const { error: updateError } = await supabase
      .from("property_inventory_items")
      .update({ photo_url: url })
      .eq("id", itemId);

    setUploadingItemId(null);
    if (updateError) return;

    setCategories((prev) =>
      prev.map((c) =>
        c.id === categoryId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, photoUrl: url } : i)) }
          : c,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-lg">
      <p className="text-sm text-ink-secondary">
        Document what&apos;s in the property, with a photo of each item — this becomes the
        checklist guests see and you compare against at check-in and check-out.
      </p>

      <div className="flex gap-sm">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="e.g. Kitchen"
          className="rounded-sm border border-border bg-surface px-md py-sm text-sm outline-none focus:border-turquoise"
        />
        <button
          onClick={addCategory}
          className="rounded-md border border-turquoise px-md py-sm text-sm font-medium text-turquoise-dark hover:bg-turquoise-light"
        >
          Add category
        </button>
      </div>

      {categories.map((category) => (
        <div
          key={category.id}
          className="flex flex-col gap-sm rounded-lg border border-border p-md"
        >
          <div className="flex items-center justify-between">
            <p className="font-display font-semibold">{category.name}</p>
            <button
              onClick={() => removeCategory(category.id)}
              className="text-xs text-red-600 hover:underline"
            >
              Remove category
            </button>
          </div>

          <ul className="flex flex-col gap-sm">
            {category.items.map((item) => (
              <li key={item.id} className="flex items-center gap-sm">
                <label className="flex size-12 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-turquoise bg-turquoise-light text-turquoise-dark">
                  {item.photoUrl ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setLightbox(item.photoUrl);
                      }}
                      className="relative size-12"
                    >
                      <Image src={item.photoUrl} alt="" fill sizes="48px" className="object-cover" />
                    </button>
                  ) : uploadingItemId === item.id ? (
                    <span className="text-[10px]">…</span>
                  ) : (
                    <span className="text-xl leading-none">+</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadPhoto(category.id, item.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <span className="flex-1 text-sm">
                  {item.quantity}× {item.name}
                </span>
                <button
                  onClick={() => removeItem(category.id, item.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          <InventoryItemForm onAdd={(name, quantity) => addItem(category.id, name, quantity)} />
        </div>
      ))}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-lg"
          onClick={() => setLightbox(null)}
        >
          <div className="relative h-full max-h-[70vh] w-full max-w-md">
            <Image src={lightbox} alt="" fill sizes="100vw" className="object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

function InventoryItemForm({ onAdd }: { onAdd: (name: string, quantity: number) => void }) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState(1);

  return (
    <div className="flex gap-sm">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Plates"
        className="flex-1 rounded-sm border border-border bg-surface px-md py-xs text-sm outline-none focus:border-turquoise"
      />
      <input
        type="number"
        min={1}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="w-16 rounded-sm border border-border bg-surface px-sm py-xs text-sm outline-none focus:border-turquoise"
      />
      <button
        onClick={() => {
          onAdd(name, quantity);
          setName("");
          setQuantity(1);
        }}
        className="rounded-md border border-border px-md py-xs text-sm text-ink-secondary hover:border-turquoise hover:text-turquoise-dark"
      >
        Add
      </button>
    </div>
  );
}
