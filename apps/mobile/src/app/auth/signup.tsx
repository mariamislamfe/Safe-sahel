import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/lib/supabase";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"guest" | "owner">("guest");
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    });
    setSubmitting(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (data.session) {
      router.back();
    } else {
      setCheckEmail(true);
    }
  }

  if (checkEmail) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center gap-sm bg-surface px-lg">
        <Text className="font-display text-xl text-ink">Check your email</Text>
        <Text className="text-center text-ink-secondary">
          We sent a confirmation link — open it, then come back and log in.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface px-lg pt-lg">
      <View className="gap-md">
        <View className="flex-row rounded-md border border-border p-xs">
          {(["guest", "owner"] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => setRole(option)}
              className={`flex-1 rounded-sm px-md py-sm ${role === option ? "bg-turquoise" : ""}`}
            >
              <Text
                className={`text-center text-sm font-medium ${role === option ? "text-white" : "text-ink-secondary"}`}
              >
                {option === "guest" ? "I'm renting" : "I'm hosting"}
              </Text>
            </Pressable>
          ))}
        </View>
        <TextInput
          value={fullName}
          onChangeText={setFullName}
          placeholder="Full name"
          className="rounded-sm border border-border bg-surface px-md py-sm text-ink"
        />
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
          placeholder="Password (at least 8 characters)"
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
            {submitting ? "Creating account…" : "Create account"}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
