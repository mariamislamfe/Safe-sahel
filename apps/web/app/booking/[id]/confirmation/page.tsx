import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatEgp } from "@safe-sahel/utils";
import { createClient } from "@/lib/supabase/server";
import { MessageHostButton } from "@/components/message-host-button";

export default async function BookingConfirmationPage(
  props: PageProps<"/booking/[id]/confirmation">,
) {
  const { id } = await props.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, property_id, check_in, check_out, total_amount, deposit_amount, status")
    .eq("id", id)
    .eq("guest_id", user.id)
    .maybeSingle();

  if (!booking) notFound();

  const { data: property } = await supabase
    .from("properties")
    .select("title, slug, owner_id")
    .eq("id", booking.property_id)
    .maybeSingle();

  const nextSteps = [
    {
      title: "Message the host now",
      body: "Coordinate the security deposit and your arrival time — everything stays inside Safe Sahel.",
    },
    {
      title: "Pay at check-in",
      body: `The deposit (${formatEgp(Number(booking.deposit_amount))}) plus the rest of the stay is settled directly with the host when you arrive.`,
    },
    {
      title: "Check-in walkthrough",
      body: "The host photographs the property's inventory with you there — proof everything's in order before your stay.",
    },
    {
      title: "Check-out & deposit back",
      body: "Same walkthrough on your way out. Once reviewed, your deposit is returned in full — minus anything genuinely missing or damaged.",
    },
  ];

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-lg px-lg py-4xl text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-turquoise-light text-2xl text-turquoise-dark">
        ✓
      </div>
      <div className="flex flex-col gap-xs">
        <h1 className="font-display text-2xl font-bold">Booking confirmed!</h1>
        <p className="text-ink-secondary">
          {property?.title ?? "Your stay"} · {booking.check_in} → {booking.check_out} ·{" "}
          {formatEgp(Number(booking.total_amount))} total
        </p>
      </div>

      {property?.owner_id && (
        <div className="flex flex-col items-center gap-xs">
          <MessageHostButton
            propertyId={booking.property_id}
            ownerId={property.owner_id}
            guestId={user.id}
            label="Message the host"
          />
          <p className="text-xs text-ink-secondary">
            No reply within 24 hours? Let us know at{" "}
            <a href="https://wa.me/201123094983" className="font-medium text-turquoise-dark">
              01123094983
            </a>
            .
          </p>
        </div>
      )}

      <div className="flex w-full flex-col gap-md rounded-2xl border border-border p-lg text-start">
        <p className="font-display text-sm font-semibold text-ink">What happens next</p>
        {nextSteps.map((step, i) => (
          <div key={step.title} className="flex gap-md">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-turquoise-light text-xs font-bold text-turquoise-dark">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-medium text-ink">{step.title}</p>
              <p className="text-xs text-ink-secondary">{step.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-md">
        <Link href="/account/bookings" className="font-medium text-turquoise-dark">
          View your bookings
        </Link>
        {property?.slug && (
          <Link href={`/properties/${property.slug}`} className="font-medium text-ink-secondary">
            Back to property
          </Link>
        )}
      </div>
    </main>
  );
}
