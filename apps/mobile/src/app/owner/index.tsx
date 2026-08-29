import { useState } from "react";
import { FlatList, Image, Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatEgp } from "@safe-sahel/utils";
import { useAuth } from "@/lib/auth-context";
import { useOwnerProperties } from "@/lib/queries/owner";
import { supabase } from "@/lib/supabase";
import { SignInPrompt } from "@/components/sign-in-prompt";

export default function OwnerHomeScreen() {
  const { profile, loading, refetch } = useAuth();
  const router = useRouter();
  const { data: properties, isLoading } = useOwnerProperties(profile?.id);
  const [enabling, setEnabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && !profile) {
    return <SignInPrompt message="Log in to host a property." />;
  }

  const isHost = profile?.role === "owner" || profile?.role === "admin";

  if (profile && !isHost) {
    async function enableHosting() {
      setEnabling(true);
      setError(null);
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "owner" })
        .eq("id", profile!.id);
      if (updateError) {
        setError(updateError.message);
        setEnabling(false);
        return;
      }
      await refetch();
      setEnabling(false);
    }

    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-md bg-surface px-lg">
        <Text className="font-display text-xl text-ink">Become a host</Text>
        <Text className="text-center text-ink-secondary">
          List your chalet or villa. You can still browse and book as a guest too.
        </Text>
        <Pressable
          onPress={enableHosting}
          disabled={enabling}
          className="rounded-md bg-turquoise px-xl py-md"
        >
          <Text className="font-body font-medium text-white">
            {enabling ? "Enabling…" : "Enable hosting"}
          </Text>
        </Pressable>
        {error && <Text className="text-sm text-red-600">{error}</Text>}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["bottom"]}>
      <View className="flex-row items-center justify-between px-lg py-md">
        <Link href="/owner/bookings" className="text-sm font-medium text-turquoise-dark">
          Booking requests
        </Link>
        <Pressable
          onPress={() => router.push("/owner/new")}
          className="rounded-md bg-turquoise px-md py-sm"
        >
          <Text className="text-sm font-medium text-white">Add property</Text>
        </Pressable>
      </View>

      <FlatList
        data={properties ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 12, paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-md rounded-lg border border-border p-md">
            {item.coverImageUrl ? (
              <Image source={{ uri: item.coverImageUrl }} className="size-14 rounded-md" />
            ) : (
              <View className="size-14 items-center justify-center rounded-md bg-surface-soft">
                <Text className="text-[10px] text-ink-secondary">No photo</Text>
              </View>
            )}
            <View className="flex-1 gap-xs">
              <Text className="font-display text-sm text-ink">{item.title}</Text>
              <Text className="text-xs capitalize text-ink-secondary">
                {item.status.replace("_", " ")}
              </Text>
              <Text className="text-sm text-ink">{formatEgp(item.pricePerNight)} / night</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center gap-xs py-4xl">
              <Text className="text-sm text-ink-secondary">No properties yet.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
