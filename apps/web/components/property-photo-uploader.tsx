"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PhotoItem = { id: string; url: string; isCover: boolean };

export function PropertyPhotoUploader({
  propertyId,
  ownerId,
  initialImages,
}: {
  propertyId: string;
  ownerId: string;
  initialImages: PhotoItem[];
}) {
  const router = useRouter();
  const [images, setImages] = useState(initialImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const path = `${ownerId}/${propertyId}/${crypto.randomUUID()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("property-images")
        .upload(path, file);
      if (uploadError) {
        setError(uploadError.message);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("property-images").getPublicUrl(path);

      const { data: row, error: insertError } = await supabase
        .from("property_images")
        .insert({
          property_id: propertyId,
          url: publicUrl,
          sort_order: images.length,
          is_cover: images.length === 0,
        })
        .select("id, url, is_cover")
        .single();

      if (!insertError && row) {
        setImages((prev) => [...prev, { id: row.id, url: row.url, isCover: row.is_cover }]);
      }
    }

    setUploading(false);
    router.refresh();
  }

  async function setCover(id: string) {
    const supabase = createClient();
    await supabase
      .from("property_images")
      .update({ is_cover: false })
      .eq("property_id", propertyId);
    await supabase.from("property_images").update({ is_cover: true }).eq("id", id);
    setImages((prev) => prev.map((img) => ({ ...img, isCover: img.id === id })));
  }

  async function removeImage(id: string) {
    const supabase = createClient();
    await supabase.from("property_images").delete().eq("id", id);
    setImages((prev) => prev.filter((img) => img.id !== id));
  }

  return (
    <div className="flex flex-col gap-md">
      <label className="flex w-fit cursor-pointer items-center gap-sm rounded-md border border-dashed border-border px-lg py-md text-sm font-medium text-ink-secondary hover:border-turquoise hover:text-turquoise-dark">
        {uploading ? "Uploading…" : "Upload photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-md sm:grid-cols-3">
          {images.map((img) => (
            <div key={img.id} className="flex flex-col gap-xs">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md border border-border">
                <Image src={img.url} alt="" fill className="object-cover" />
                {img.isCover && (
                  <span className="absolute left-xs top-xs rounded-full bg-butter px-sm py-xs text-xs font-medium">
                    Cover
                  </span>
                )}
              </div>
              <div className="flex gap-sm text-xs">
                {!img.isCover && (
                  <button
                    onClick={() => setCover(img.id)}
                    className="text-turquoise-dark hover:underline"
                  >
                    Set as cover
                  </button>
                )}
                <button
                  onClick={() => removeImage(img.id)}
                  className="text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
