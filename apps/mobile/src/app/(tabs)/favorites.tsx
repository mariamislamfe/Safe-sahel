import { FlatList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { useFavorites } from "@/lib/queries/favorites";
import { PropertyCard, fromRealProperty } from "@/components/property-card";
import { SignInPrompt } from "@/components/sign-in-prompt";

export default function FavoritesScreen() {
  const { profile, loading } = useAuth();
  const { data: properties, isLoading } = useFavorites(profile?.id);

  if (!loading && !profile) {
    return <SignInPrompt message="Log in to save and view your favorite properties." />;
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="px-lg pb-md pt-lg">
        <Text className="font-display text-2xl text-ink">Favorites</Text>
      </View>
      <FlatList
        data={(properties ?? []).map(fromRealProperty)}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => <PropertyCard property={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center gap-sm px-lg py-4xl">
              <Text className="text-2xl text-ink-secondary">♡</Text>
              <Text className="font-display text-base text-ink">No favorites yet</Text>
              <Text className="text-center text-sm text-ink-secondary">
                Tap the heart on any property to save it here.
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}
