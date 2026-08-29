import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { AdminVerificationActions } from "@/components/admin-verification-actions";

const statusStyles: Record<string, string> = {
  pending: "bg-butter-soft text-ink",
  contacted: "bg-turquoise-light text-turquoise-dark",
  approved: "bg-turquoise-light text-turquoise-dark",
  rejected: "bg-red-50 text-red-700",
};

export default async function AdminVerificationPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("verification_requests")
    .select("id, profile_id, full_name, phone, sahel_location, id_document_url, status, created_at")
    .order("created_at", { ascending: false });

  const withSignedUrls = await Promise.all(
    (requests ?? []).map(async (r) => {
      const { data } = await supabase.storage
        .from("verification-documents")
        .createSignedUrl(r.id_document_url, 60 * 10);
      return { ...r, signedIdUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-lg">
      <h1 className="font-display text-2xl font-bold">Verification requests</h1>

      {withSignedUrls.length === 0 ? (
        <p className="text-sm text-ink-secondary">No requests yet.</p>
      ) : (
        <div className="flex flex-col gap-md">
          {withSignedUrls.map((request) => (
            <div
              key={request.id}
              className="flex flex-col gap-md rounded-lg border border-border p-lg sm:flex-row"
            >
              {request.signedIdUrl && (
                <div className="relative h-40 w-full flex-none overflow-hidden rounded-md border border-border sm:w-56">
                  <Image
                    src={request.signedIdUrl}
                    alt="ID document"
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex flex-1 flex-col gap-xs">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <p className="font-display font-semibold text-ink">{request.full_name}</p>
                  <span
                    className={`rounded-full px-sm py-xs text-xs font-medium capitalize ${statusStyles[request.status]}`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="text-sm text-ink-secondary">{request.phone}</p>
                <p className="text-sm text-ink-secondary">{request.sahel_location}</p>
                <p className="text-xs text-ink-secondary">
                  Requested {new Date(request.created_at).toLocaleDateString()}
                </p>
                {(request.status === "pending" || request.status === "contacted") && (
                  <div className="mt-sm">
                    <AdminVerificationActions
                      requestId={request.id}
                      profileId={request.profile_id}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
