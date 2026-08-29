import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { propertyTypeOptions } from "@safe-sahel/validation";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

function slugify(title: string) {
  return (
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "property"
  );
}

export default function NewPropertyScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<(typeof propertyTypeOptions)[number]>("chalet");
  const [description, setDescription] = useState("");
  const [bedrooms, setBedrooms] = useState("1");
  const [bathrooms, setBathrooms] = useState("1");
  const [maxGuests, setMaxGuests] = useState("2");
  const [pricePerNight, setPricePerNight] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!profile) return;
    if (!title.trim() || !pricePerNight) {
      setError("Title and price are required.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("properties").insert({
      owner_id: profile.id,
      title: title.trim(),
      slug: `${slugify(title)}-${Date.now().toString(36)}`,
      type,
      description: description || null,
      bedrooms: Number(bedrooms) || 1,
      bathrooms: Number(bathrooms) || 1,
      max_guests: Number(maxGuests) || 1,
      price_per_night: Number(pricePerNight),
      status: "draft",
    });

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <ScrollView contentContainerClassName="gap-md p-lg">
        <Text className="text-xs text-ink-secondary">
          Created as a draft — add photos and publish from the website for the full editor.
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title, e.g. Chalet Zaha"
          className="rounded-sm border border-border bg-surface px-md py-sm text-ink"
        />

        <View className="flex-row flex-wrap gap-xs">
          {propertyTypeOptions.map((option) => (
            <Pressable
              key={option}
              onPress={() => setType(option)}
              className={`rounded-full border px-md py-xs ${type === option ? "border-turquoise bg-turquoise-light" : "border-border"}`}
            >
              <Text className={type === option ? "text-turquoise-dark" : "text-ink-secondary"}>
                {option.replace("_", " ")}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder="Description"
          multiline
          numberOfLines={4}
          className="rounded-sm border border-border bg-surface px-md py-sm text-ink"
        />

        <View className="flex-row gap-sm">
          <TextInput
            value={bedrooms}
            onChangeText={setBedrooms}
            placeholder="Bedrooms"
            keyboardType="number-pad"
            className="flex-1 rounded-sm border border-border bg-surface px-md py-sm text-ink"
          />
          <TextInput
            value={bathrooms}
            onChangeText={setBathrooms}
            placeholder="Bathrooms"
            keyboardType="number-pad"
            className="flex-1 rounded-sm border border-border bg-surface px-md py-sm text-ink"
          />
          <TextInput
            value={maxGuests}
            onChangeText={setMaxGuests}
            placeholder="Guests"
            keyboardType="number-pad"
            className="flex-1 rounded-sm border border-border bg-surface px-md py-sm text-ink"
          />
        </View>

        <TextInput
          value={pricePerNight}
          onChangeText={setPricePerNight}
          placeholder="Price per night (EGP)"
          keyboardType="number-pad"
          className="rounded-sm border border-border bg-surface px-md py-sm text-ink"
        />

        {error && <Text className="text-sm text-red-600">{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={submitting}
          className="rounded-md bg-turquoise px-xl py-md disabled:opacity-60"
        >
          <Text className="text-center font-body font-medium text-white">
            {submitting ? "Creating…" : "Create property"}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
