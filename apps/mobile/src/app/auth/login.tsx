import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { Link, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Wrong email or password."
          : signInError.message,
      );
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface px-lg pt-lg">
      <View className="gap-md">
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          className="rounded-sm border border-border bg-surface px-md py-sm text-ink"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          className="rounded-sm border border-border bg-surface px-md py-sm text-ink"
        />
        {error && <Text className="text-sm text-red-600">{error}</Text>}
        <Pressable
          onPress={submit}
          disabled={submitting}
          className="rounded-md bg-turquoise px-xl py-md disabled:opacity-60"
        >
          <Text className="text-center font-body font-medium text-white">
            {submitting ? "Logging in…" : "Log in"}
          </Text>
        </Pressable>
        <Link href="/auth/signup" className="text-center text-sm text-turquoise-dark">
          Create an account
        </Link>
      </View>
    </SafeAreaView>
  );
}
