import { Pressable, Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export default function BookingConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-md bg-surface px-lg">
      <View className="size-12 items-center justify-center rounded-full bg-turquoise-light">
        <Text className="text-2xl text-turquoise-dark">✓</Text>
      </View>
      <Text className="font-display text-2xl text-ink">Request sent</Text>
      <Text className="text-center text-ink-secondary">
        The host will confirm your dates soon. You&apos;ll pay once confirmed.
      </Text>
      <Link href="/(tabs)/bookings" asChild>
        <Pressable>
          <Text className="font-body font-medium text-turquoise-dark">View your bookings</Text>
        </Pressable>
      </Link>
      <Text className="text-xs text-ink-secondary">Booking #{id?.slice(0, 8)}</Text>
    </SafeAreaView>
  );
}
