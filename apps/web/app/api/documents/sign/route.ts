import { NextResponse, type NextRequest } from "next/server";
import { rpcErrorCode } from "@safe-sahel/utils";
import type { DocumentKindEnum } from "@safe-sahel/types";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const KINDS: DocumentKindEnum[] = [
  "verification_id",
  "verification_proof",
  "broker_authorization",
  "guest_id",
  "payment_proof",
];

/** Signed URLs for ID documents live for 60 seconds only. */
const SIGNED_URL_TTL_SECONDS = 60;

/**
 * POST { kind, id } → { url }
 *
 * 1. authorize_document_access() runs AS THE CALLER: it checks they may see
 *    this exact document (admin / owner of that confirmed booking / …) and
 *    writes the access-log row in the same transaction.
 * 2. Only then is a short-lived URL minted with the service role — the
 *    private buckets have no client read policy at all.
 */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { kind?: string; id?: string } | null;
  const kind = body?.kind as DocumentKindEnum | undefined;
  const id = body?.id;
  if (!kind || !KINDS.includes(kind) || !id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "service_unavailable" }, { status: 503 });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("authorize_document_access", {
    p_kind: kind,
    p_record_id: id,
  });
  if (error || !data?.[0]) {
    const code = rpcErrorCode(error?.message) ?? "not_authorized";
    return NextResponse.json({ error: code }, { status: code === "not_authenticated" ? 401 : 403 });
  }

  const { bucket, storage_path } = data[0];
  const { data: signed, error: signError } = await admin.storage
    .from(bucket)
    .createSignedUrl(storage_path, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed) {
    return NextResponse.json({ error: "document_not_found" }, { status: 404 });
  }

  return NextResponse.json(
    { url: signed.signedUrl, expiresIn: SIGNED_URL_TTL_SECONDS },
    { headers: { "Cache-Control": "no-store" } },
  );
}
