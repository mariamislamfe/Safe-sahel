import { FlatList, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePublishedProperties } from "@/lib/queries/properties";
import { useLocations } from "@/lib/queries/locations";
import { PropertyCard, fromRealProperty } from "@/components/property-card";
import { CategoryCard } from "@/components/category-card";
import { LocationCard } from "@/components/location-card";

const categories = [
  { id: "villa", label: "Villas", icon: "🏡" },
  { id: "chalet", label: "Chalets", icon: "🏖️" },
  { id: "apartment", label: "Apartments", icon: "🏢" },
  { id: "hotel", label: "Hotels", icon: "🏨" },
] as const;

export default function HomeScreen() {
  const router = useRouter();
  const { data: realProperties, isRefetching, refetch } = usePublishedProperties();
  const { data: locations } = useLocations();

  const properties = (realProperties ?? []).map(fromRealProperty);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        contentContainerClassName="gap-2xl pb-4xl"
      >
        <View className="gap-md px-lg pb-sm pt-lg">
          <Text className="font-mono text-xs uppercase tracking-widest text-turquoise-dark">
            Safe Sahel
          </Text>
          <Text className="font-display text-3xl leading-tight text-ink">
            Find your perfect stay in Sahel
          </Text>
          <Text className="text-sm text-ink-secondary">
            Chalets and villas booked directly from owners.
          </Text>

          <Pressable
            onPress={() => router.push("/explore")}
            className="mt-sm flex-row items-center gap-sm rounded-full border border-border bg-surface px-lg py-md shadow-sm"
          >
            <Text className="text-ink-secondary">⌕</Text>
            <Text className="text-sm text-ink-secondary">Search Sahel, compound, or property</Text>
          </Pressable>
        </View>

        <View className="gap-md">
          <Text className="px-lg font-display text-lg text-ink">Explore stays</Text>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={categories}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ gap: 16, paddingHorizontal: 16 }}
            renderItem={({ item }) => (
              <CategoryCard label={item.label} icon={item.icon} category={item.id} />
            )}
          />
        </View>

        {locations && locations.length > 0 && (
          <View className="gap-md">
            <Text className="px-lg font-display text-lg text-ink">Explore by location</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={locations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <LocationCard
                  name={item.name}
                  area={item.area}
                  propertyCount={item.propertyCount}
                  imageUrl={item.coverImageUrl}
                />
              )}
            />
          </View>
        )}

        <View className="gap-md">
          <Text className="px-lg font-display text-lg text-ink">
            {properties.length > 0 ? "New on Safe Sahel" : "Stays"}
          </Text>
          {properties.length > 0 ? (
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={properties}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ gap: 12, paddingHorizontal: 16 }}
              renderItem={({ item }) => (
                <View style={{ width: 200 }}>
                  <PropertyCard property={item} />
                </View>
              )}
            />
          ) : (
            <View className="items-center gap-xs px-lg py-xl">
              <Text className="text-sm text-ink-secondary">No stays published yet.</Text>
            </View>
          )}
        </View>

        <View className="mx-lg items-center gap-sm rounded-2xl bg-ink px-lg py-2xl">
          <Text className="text-center font-display text-lg font-bold text-white">
            Have a place on the North Coast?
          </Text>
          <Text className="text-center text-sm text-white/70">
            List it on Safe Sahel and reach guests directly.
          </Text>
          <Pressable
            onPress={() => router.push("/owner")}
            className="mt-xs rounded-full bg-turquoise px-lg py-sm"
          >
            <Text className="text-sm font-semibold text-white">List your property</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
