import { FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatEgp } from "@safe-sahel/utils";
import { useAuth } from "@/lib/auth-context";
import { useOwnerBookings, useRespondToBooking } from "@/lib/queries/owner";

export default function OwnerBookingsScreen() {
  const { profile } = useAuth();
  const { data: bookings, isLoading } = useOwnerBookings(profile?.id);
  const respond = useRespondToBooking();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["bottom"]}>
      <FlatList
        data={bookings ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, padding: 16 }}
        renderItem={({ item }) => (
          <View className="gap-sm rounded-lg border border-border p-md">
            <Text className="font-display text-sm text-ink">{item.propertyTitle}</Text>
            <Text className="text-sm text-ink-secondary">
              {item.guestName ?? "Guest"} · {item.checkIn} → {item.checkOut}
            </Text>
            <Text className="text-sm font-medium text-ink">{formatEgp(item.totalAmount)}</Text>
            {item.status === "pending_payment" ? (
              <View className="flex-row gap-sm">
                <Pressable
                  onPress={() => respond.mutate({ bookingId: item.id, decision: "confirmed" })}
                  className="rounded-md bg-turquoise px-md py-xs"
                >
                  <Text className="text-sm font-medium text-white">Confirm</Text>
                </Pressable>
                <Pressable
                  onPress={() => respond.mutate({ bookingId: item.id, decision: "declined" })}
                  className="rounded-md border border-border px-md py-xs"
                >
                  <Text className="text-sm text-ink-secondary">Decline</Text>
                </Pressable>
              </View>
            ) : (
              <Text className="text-xs capitalize text-ink-secondary">
                {item.status.replace("_", " ")}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center gap-xs py-4xl">
              <Text className="text-sm text-ink-secondary">No booking requests yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
