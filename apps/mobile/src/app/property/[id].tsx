import { useMemo, useState } from "react";
import { Image } from "expo-image";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatEgp } from "@safe-sahel/utils";
import { usePropertyById } from "@/lib/queries/properties";
import { usePropertyUnavailableRanges, useDepositPercentage } from "@/lib/queries/availability";
import { useCreateBooking } from "@/lib/queries/create-booking";
import { useIsFavorite, useToggleFavorite } from "@/lib/queries/favorites";
import { useAuth } from "@/lib/auth-context";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export default function PropertyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { data: property, isLoading } = usePropertyById(id);
  const { data: unavailableRanges = [] } = usePropertyUnavailableRanges(id);
  const { data: depositPercentage = 20 } = useDepositPercentage();
  const { data: isFavorite = false } = useIsFavorite(profile?.id, id);
  const toggleFavorite = useToggleFavorite(profile?.id, id);
  const createBooking = useCreateBooking();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1");
  const [bookingError, setBookingError] = useState<string | null>(null);

  const nights =
    DATE_RE.test(checkIn) && DATE_RE.test(checkOut) ? daysBetween(checkIn, checkOut) : 0;
  const basePrice = property && nights > 0 ? nights * property.pricePerNight : 0;
  const depositAmount = Math.round(basePrice * (depositPercentage / 100));
  const totalAmount = basePrice + depositAmount;

  const validationError = useMemo(() => {
    if (!property) return null;
    if (!DATE_RE.test(checkIn) || !DATE_RE.test(checkOut)) return null;
    if (nights <= 0) return "Check-out must be after check-in.";
    if (nights < property.minStayNights)
      return `Minimum stay is ${property.minStayNights} night(s).`;
    const guestsNum = Number(guests) || 0;
    if (guestsNum > property.maxGuests) return `Sleeps up to ${property.maxGuests} guests.`;
    const overlaps = unavailableRanges.some((r) => checkIn < r.end && checkOut > r.start);
    if (overlaps) return "Those dates aren't available.";
    return null;
  }, [property, checkIn, checkOut, nights, guests, unavailableRanges]);

  async function submitBooking() {
    if (!profile) {
      router.push("/auth/login");
      return;
    }
    if (!property || validationError || nights <= 0) return;
    setBookingError(null);

    try {
      const bookingId = await createBooking.mutateAsync({
        propertyId: property.id,
        guestId: profile.id,
        checkIn,
        checkOut,
        guestsCount: Number(guests) || 1,
        nights,
        basePrice,
        depositAmount,
        totalAmount,
      });
      router.push(`/booking/${bookingId}/confirmation` as never);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : "Could not create booking.");
    }
  }

  if (isLoading || !property) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-surface">
        <Text className="text-ink-secondary">Loading…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={["bottom"]}>
      <ScrollView contentContainerClassName="gap-lg pb-4xl">
        <View className="aspect-[16/9] w-full bg-surface-soft">
          {property.coverImageUrl ? (
            <Image
              source={{ uri: property.coverImageUrl }}
              style={{ flex: 1 }}
              contentFit="cover"
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm text-ink-secondary">No photos yet</Text>
            </View>
          )}
        </View>

        <View className="gap-md px-lg">
          <View className="flex-row items-start justify-between gap-md">
            <View className="flex-1 gap-xs">
              <Text className="font-display text-2xl text-ink">{property.title}</Text>
              {property.compoundName && (
                <Text className="text-ink-secondary">{property.compoundName}</Text>
              )}
            </View>
            {profile && (
              <Pressable
                onPress={() => toggleFavorite.mutate(!isFavorite)}
                className={`rounded-full border px-md py-xs ${isFavorite ? "border-turquoise bg-turquoise-light" : "border-border"}`}
              >
                <Text className={isFavorite ? "text-turquoise-dark" : "text-ink-secondary"}>
                  {isFavorite ? "♥ Saved" : "♡ Save"}
                </Text>
              </Pressable>
            )}
          </View>

          <Text className="text-ink-secondary">
            {property.bedrooms} bedrooms · {property.bathrooms} bathrooms · up to{" "}
            {property.maxGuests} guests
          </Text>

          {property.description && <Text className="text-ink">{property.description}</Text>}

          {property.amenities.length > 0 && (
            <View className="flex-row flex-wrap gap-sm">
              {property.amenities.map((a) => (
                <Text
                  key={a.name}
                  className="rounded-full border border-border px-md py-xs text-sm text-ink"
                >
                  {a.name}
                </Text>
              ))}
            </View>
          )}

          <View className="gap-sm rounded-lg border border-border bg-surface-soft p-lg">
            <Text className="font-display text-xl text-ink">
              {formatEgp(property.pricePerNight)}{" "}
              <Text className="text-sm text-ink-secondary">/ night</Text>
            </Text>

            <View className="flex-row gap-sm">
              <TextInput
                value={checkIn}
                onChangeText={setCheckIn}
                placeholder="Check-in YYYY-MM-DD"
                className="flex-1 rounded-sm border border-border bg-surface px-md py-sm text-sm text-ink"
              />
              <TextInput
                value={checkOut}
                onChangeText={setCheckOut}
                placeholder="Check-out YYYY-MM-DD"
                className="flex-1 rounded-sm border border-border bg-surface px-md py-sm text-sm text-ink"
              />
            </View>
            <TextInput
              value={guests}
              onChangeText={setGuests}
              placeholder="Guests"
              keyboardType="number-pad"
              className="w-24 rounded-sm border border-border bg-surface px-md py-sm text-sm text-ink"
            />

            {nights > 0 && (
              <View className="gap-xs rounded-md bg-surface p-md">
                <View className="flex-row justify-between">
                  <Text className="text-sm text-ink-secondary">
                    {formatEgp(property.pricePerNight)} × {nights} nights
                  </Text>
                  <Text className="text-sm text-ink">{formatEgp(basePrice)}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm text-ink-secondary">Deposit ({depositPercentage}%)</Text>
                  <Text className="text-sm text-ink">{formatEgp(depositAmount)}</Text>
                </View>
                <View className="flex-row justify-between border-t border-border pt-xs">
                  <Text className="text-sm font-medium text-ink">Total</Text>
                  <Text className="text-sm font-medium text-ink">{formatEgp(totalAmount)}</Text>
                </View>
              </View>
            )}

            {(validationError || bookingError) && (
              <Text className="text-sm text-red-600">{validationError ?? bookingError}</Text>
            )}

            <Pressable
              onPress={submitBooking}
              disabled={createBooking.isPending || !!validationError || nights <= 0}
              className="rounded-md bg-turquoise px-xl py-md disabled:opacity-60"
            >
              <Text className="text-center font-body font-medium text-white">
                {createBooking.isPending
                  ? "Sending request…"
                  : profile
                    ? "Request to book"
                    : "Log in to book"}
              </Text>
            </Pressable>
            <Text className="text-xs text-ink-secondary">
              Sends a request to the host — you pay once they confirm.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
