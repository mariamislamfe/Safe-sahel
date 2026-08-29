import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { formatEgp } from "@safe-sahel/utils";
import { useAuth } from "@/lib/auth-context";
import { useGuestBookings, useSubmitReview, type GuestBooking } from "@/lib/queries/bookings";
import { SignInPrompt } from "@/components/sign-in-prompt";
import { SafeAreaView } from "react-native-safe-area-context";

const statusLabel: Record<string, string> = {
  pending_payment: "Awaiting host",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

function BookingRow({ booking, guestId }: { booking: GuestBooking; guestId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const submitReview = useSubmitReview();

  return (
    <View className="gap-sm rounded-lg border border-border p-md">
      <View className="flex-row items-center justify-between">
        <Text className="font-display text-base text-ink">{booking.propertyTitle}</Text>
        <Text className="rounded-full bg-surface-soft px-sm py-xs text-xs text-ink-secondary">
          {statusLabel[booking.status] ?? booking.status}
        </Text>
      </View>
      <Text className="text-sm text-ink-secondary">
        {booking.checkIn} → {booking.checkOut} · {booking.guestsCount} guests
      </Text>
      <Text className="text-sm font-medium text-ink">{formatEgp(booking.totalAmount)}</Text>

      {booking.canReview &&
        (submitReview.isSuccess ? (
          <Text className="text-sm text-turquoise-dark">Thanks for your review!</Text>
        ) : (
          <View className="gap-sm border-t border-border pt-sm">
            <View className="flex-row gap-xs">
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)}>
                  <Text className={n <= rating ? "text-butter" : "text-border"}>★</Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="How was your stay?"
              className="rounded-sm border border-border bg-surface px-md py-sm text-sm text-ink"
            />
            <Pressable
              onPress={() =>
                submitReview.mutate({
                  bookingId: booking.id,
                  propertyId: booking.propertyId,
                  guestId,
                  ratingOverall: rating,
                  comment,
                })
              }
              className="self-start rounded-md bg-turquoise px-md py-xs"
            >
              <Text className="text-sm font-medium text-white">
                {submitReview.isPending ? "Submitting…" : "Submit review"}
              </Text>
            </Pressable>
          </View>
        ))}
    </View>
  );
}

export default function BookingsScreen() {
  const { profile, loading } = useAuth();
  const { data: bookings, isLoading } = useGuestBookings(profile?.id);

  if (!loading && !profile) {
    return <SignInPrompt message="Log in to see your bookings." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-lg pb-md pt-lg">
        <Text className="font-display text-2xl text-ink">Bookings</Text>
      </View>
      <FlatList
        data={bookings ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => <BookingRow booking={item} guestId={profile!.id} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center gap-xs px-lg py-4xl">
              <Text className="text-sm text-ink-secondary">No bookings yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
