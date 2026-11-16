"use client";

import { safeStorageName } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/client";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const DOC_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export type UploadCheck = "ok" | "too_large" | "bad_type";

export function checkFile(file: File, kind: "document" | "photo" = "document"): UploadCheck {
  if (file.size > MAX_UPLOAD_BYTES) return "too_large";
  const allowed = kind === "photo" ? PHOTO_TYPES : DOC_TYPES;
  // Some Android browsers leave HEIC type empty — fall back to extension.
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extOk =
    kind === "photo"
      ? ["jpg", "jpeg", "png", "webp", "heic"]
      : ["jpg", "jpeg", "png", "webp", "heic", "pdf"];
  if (!allowed.includes(file.type) && !extOk.includes(ext)) return "bad_type";
  return "ok";
}

/**
 * Upload to a private bucket under `{uid}/{...folders}/{random}.{ext}`.
 * The original filename is never stored (it often contains a person's name).
 */
export async function uploadPrivate(bucket: string, folders: string[], file: File) {
  const supabase = createClient();
  const path = [...folders, safeStorageName(file.name, crypto.randomUUID())].join("/");
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  return { path, error };
}

/** SHA-256 of a photo, used to detect the same pictures on two listings. */
export async function sha256Hex(file: File): Promise<string | null> {
  try {
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch {
    return null;
  }
}
