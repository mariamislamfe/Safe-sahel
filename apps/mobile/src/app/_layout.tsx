import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Tajawal_500Medium, Tajawal_700Bold } from "@expo-google-fonts/tajawal";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth-context";
import { queryClient } from "@/lib/query-client";
import "../global.css";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Tajawal_500Medium,
    Tajawal_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="property/[id]" options={{ headerShown: true, title: "" }} />
          <Stack.Screen
            name="auth/login"
            options={{ presentation: "modal", headerShown: true, title: "Log in" }}
          />
          <Stack.Screen
            name="auth/signup"
            options={{ presentation: "modal", headerShown: true, title: "Sign up" }}
          />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
