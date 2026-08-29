import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getHandoverDetail } from "@/lib/queries/handover";
import { AdminHandoverReview } from "@/components/admin-handover-review";

export default async function AdminHandoverDetailPage(
  props: PageProps<"/admin/handovers/[bookingId]">,
) {
  const { bookingId } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const handover = await getHandoverDetail(bookingId);
  if (!handover) notFound();

  return (
    <div className="flex flex-col gap-lg">
      <div className="flex flex-col gap-xs">
        <Link href="/admin/handovers" className="text-sm text-ink-secondary hover:text-ink">
          ← Back to handovers
        </Link>
        <h1 className="font-display text-2xl font-bold">{handover.propertyTitle}</h1>
        <p className="text-sm text-ink-secondary">Guest: {handover.guestName ?? "Guest"}</p>
      </div>

      {handover.status === "resolved" ? (
        <p className="text-sm text-ink-secondary">This handover was already resolved.</p>
      ) : (
        <AdminHandoverReview
          adminId={user.id}
          bookingId={handover.bookingId}
          depositAmount={handover.depositAmount}
          inventory={handover.inventory}
          photos={handover.photos}
        />
      )}
    </div>
  );
}
