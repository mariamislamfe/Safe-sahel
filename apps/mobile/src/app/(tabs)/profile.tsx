import { Pressable, Text, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { SignInPrompt } from "@/components/sign-in-prompt";

export default function ProfileScreen() {
  const { profile, loading } = useAuth();
  const router = useRouter();

  if (loading) return null;

  if (!profile) {
    return <SignInPrompt message="Log in to manage your profile, bookings, and hosting." />;
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <SafeAreaView className="flex-1 bg-surface px-lg pt-lg" edges={["top"]}>
      <View className="gap-xs">
        <Text className="font-display text-2xl text-ink">{profile.fullName ?? "Your account"}</Text>
        <Text className="text-sm text-ink-secondary">{profile.email}</Text>
        <Text className="text-xs uppercase tracking-widest text-turquoise-dark">
          {profile.role}
        </Text>
      </View>

      <View className="mt-xl gap-sm">
        <Link href="/owner" asChild>
          <Pressable className="rounded-md border border-border px-lg py-md">
            <Text className="font-body text-ink">Hosting</Text>
          </Pressable>
        </Link>
        <Pressable onPress={signOut} className="rounded-md border border-border px-lg py-md">
          <Text className="font-body text-ink-secondary">Sign out</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
