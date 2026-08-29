import { useMemo, useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePublishedProperties } from "@/lib/queries/properties";
import { PropertyCard, fromRealProperty } from "@/components/property-card";

const categories = [
  { id: "villa", label: "Villas" },
  { id: "chalet", label: "Chalets" },
  { id: "apartment", label: "Apartments" },
  { id: "hotel", label: "Hotels" },
] as const;

export default function ExploreScreen() {
  const params = useLocalSearchParams<{ type?: string; location?: string }>();
  const { data: realProperties, isLoading } = usePublishedProperties();
  const [query, setQuery] = useState(params.location ?? "");
  const [activeType, setActiveType] = useState(params.type ?? "");

  const allProperties = (realProperties ?? []).map(fromRealProperty);

  const filtered = useMemo(() => {
    return allProperties.filter((p) => {
      const matchesQuery = query
        ? p.title.toLowerCase().includes(query.toLowerCase()) ||
          (p.compoundName ?? "").toLowerCase().includes(query.toLowerCase())
        : true;
      return matchesQuery;
    });
  }, [allProperties, query]);

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["top"]}>
      <View className="gap-md px-lg pb-md pt-lg">
        <Text className="font-display text-2xl text-ink">Explore</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search Sahel, compound, or property"
          className="rounded-full border border-border bg-surface px-lg py-sm text-sm text-ink"
        />
        <View className="flex-row flex-wrap gap-xs">
          <FilterChip label="All" active={!activeType} onPress={() => setActiveType("")} />
          {categories.map((c) => (
            <FilterChip
              key={c.id}
              label={c.label}
              active={activeType === c.id}
              onPress={() => setActiveType((prev) => (prev === c.id ? "" : c.id))}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        renderItem={({ item }) => <PropertyCard property={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <View className="items-center gap-xs px-lg py-4xl">
              <Text className="text-sm text-ink-secondary">No stays match your search.</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-md py-xs ${active ? "border-turquoise bg-turquoise-light" : "border-border"}`}
    >
      <Text
        className={`text-xs font-medium ${active ? "text-turquoise-dark" : "text-ink-secondary"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
