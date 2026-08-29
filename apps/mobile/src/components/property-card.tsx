import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { formatEgp } from "@safe-sahel/utils";
import type { PropertyListItem } from "@/lib/queries/properties";

export type DisplayProperty = {
  id: string;
  title: string;
  compoundName: string | null;
  imageUrl: string | null;
  rating: number | null;
  maxGuests: number;
  bedrooms: number;
  pricePerNight: number;
  dayUseAvailable: boolean;
  verified: boolean;
};

export function fromRealProperty(p: PropertyListItem): DisplayProperty {
  return {
    id: p.id,
    title: p.title,
    compoundName: p.compoundName,
    imageUrl: p.coverImageUrl,
    rating: null,
    maxGuests: p.maxGuests,
    bedrooms: p.bedrooms,
    pricePerNight: p.pricePerNight,
    dayUseAvailable: p.dayUseEnabled,
    verified: p.verified,
  };
}

export function PropertyCard({ property }: { property: DisplayProperty }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/property/${property.id}`)}
      className="flex-1 overflow-hidden rounded-xl border border-border bg-surface active:opacity-90"
    >
      <View className="aspect-[4/3] w-full bg-surface-soft">
        {property.imageUrl ? (
          <Image source={{ uri: property.imageUrl }} style={{ flex: 1 }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Text className="text-xs text-ink-secondary">No photo yet</Text>
          </View>
        )}
        <View className="absolute inset-x-2 top-2 flex-row flex-wrap gap-1">
          {property.verified && (
            <View className="rounded-full bg-butter px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-ink">Verified</Text>
            </View>
          )}
          {property.dayUseAvailable && (
            <View className="rounded-full bg-surface/95 px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-turquoise-dark">Day use</Text>
            </View>
          )}
        </View>
      </View>
      <View className="gap-0.5 p-md">
        <View className="flex-row items-start justify-between gap-xs">
          <Text className="flex-1 font-display text-sm text-ink" numberOfLines={1}>
            {property.title}
          </Text>
          {property.rating !== null && (
            <Text className="text-xs font-medium text-ink">★ {property.rating.toFixed(1)}</Text>
          )}
        </View>
        {property.compoundName && (
          <Text className="text-xs text-ink-secondary" numberOfLines={1}>
            {property.compoundName}
          </Text>
        )}
        <Text className="text-xs text-ink-secondary">
          {property.maxGuests} guests · {property.bedrooms} bed{property.bedrooms === 1 ? "" : "s"}
        </Text>
        <Text className="mt-0.5 font-body text-sm text-ink">
          {formatEgp(property.pricePerNight)} <Text className="text-ink-secondary">/ night</Text>
        </Text>
      </View>
    </Pressable>
  );
}
