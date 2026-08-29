import { Stack } from "expo-router";

export default function OwnerLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: "Hosting" }} />
      <Stack.Screen name="new" options={{ title: "Add property" }} />
      <Stack.Screen name="bookings" options={{ title: "Booking requests" }} />
    </Stack>
  );
}
