import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

export function LocationCard({
  name,
  area,
  propertyCount,
  imageUrl,
}: {
  name: string;
  area: string | null;
  propertyCount: number;
  imageUrl: string | null;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/explore", params: { location: name } })}
      className="w-36 overflow-hidden rounded-xl bg-turquoise-light"
      style={{ aspectRatio: 4 / 5 }}
    >
      {imageUrl && <Image source={{ uri: imageUrl }} style={{ flex: 1 }} contentFit="cover" />}
      <View className="absolute inset-x-0 bottom-0 gap-0.5 bg-black/45 p-sm">
        <Text className="font-display text-sm font-bold text-white">{name}</Text>
        <Text className="text-[11px] text-white/85">
          {area ? `${area} · ` : ""}
          {propertyCount} {propertyCount === 1 ? "stay" : "stays"}
        </Text>
      </View>
    </Pressable>
  );
}
