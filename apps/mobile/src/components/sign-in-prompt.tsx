import { Pressable, Text } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

export function SignInPrompt({ message }: { message: string }) {
  return (
    <SafeAreaView className="flex-1 items-center justify-center gap-md bg-surface px-lg">
      <Text className="text-center text-ink-secondary">{message}</Text>
      <Link href="/auth/login" asChild>
        <Pressable className="rounded-md bg-turquoise px-xl py-md">
          <Text className="font-body font-medium text-white">Log in</Text>
        </Pressable>
      </Link>
    </SafeAreaView>
  );
}
