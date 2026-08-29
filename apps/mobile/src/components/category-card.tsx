import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

export function CategoryCard({
  label,
  icon,
  category,
}: {
  label: string;
  icon: string;
  category: string;
}) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/explore", params: { type: category } })}
      className="w-20 items-center gap-xs"
    >
      <View className="size-16 items-center justify-center rounded-full border border-border bg-turquoise-light">
        <Text className="text-2xl">{icon}</Text>
      </View>
      <Text className="text-xs font-medium text-ink">{label}</Text>
    </Pressable>
  );
}
