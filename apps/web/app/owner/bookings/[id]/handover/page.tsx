import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getHandoverDetail } from "@/lib/queries/handover";
import { HandoverChecklist } from "@/components/handover-checklist";

export default async function OwnerHandoverPage(props: PageProps<"/owner/bookings/[id]/handover">) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const handover = await getHandoverDetail(id);
  if (!handover || handover.ownerId !== user.id) notFound();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <Link href="/owner/bookings" className="text-sm text-ink-secondary hover:text-ink">
          ← Back to bookings
        </Link>
        <h1 className="font-display text-2xl font-bold">{handover.propertyTitle} — handover</h1>
        <p className="text-sm text-ink-secondary">Guest: {handover.guestName ?? "Guest"}</p>
      </div>

      {handover.status === "resolved" && (
        <div className="flex flex-col gap-xs rounded-md border border-border bg-surface-soft p-md text-sm">
          <p className="font-medium text-ink">Handover resolved by admin</p>
          {handover.deductionAmount > 0 ? (
            <p className="text-ink-secondary">
              Deduction: {handover.deductionAmount} EGP — {handover.deductionReason}
            </p>
          ) : (
            <p className="text-ink-secondary">No deductions — full deposit returned to the guest.</p>
          )}
        </div>
      )}

      <HandoverChecklist
        ownerId={user.id}
        bookingId={handover.bookingId}
        inventory={handover.inventory}
        initialPhotos={handover.photos}
        initialStatus={handover.status}
      />
    </div>
  );
}
