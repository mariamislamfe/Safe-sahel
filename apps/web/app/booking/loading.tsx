import { PageSkeleton } from "@/components/page-skeleton";

export default function BookingLoading() {
  return (
    <div className="mx-auto max-w-lg px-lg py-3xl">
      <PageSkeleton rows={2} />
    </div>
  );
}
