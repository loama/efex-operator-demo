import { DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from "@expo-google-fonts/dm-sans";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css";
import { shouldMountApp } from "../lib/startup";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    DMSansMedium: DMSans_500Medium,
    DMSansSemiBold: DMSans_600SemiBold,
    DMSansBold: DMSans_700Bold,
    InterRegular: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemiBold: Inter_600SemiBold,
  });
  const [timedOut, setTimedOut] = useState(false);
  const ready = shouldMountApp({ fontsLoaded: loaded, fontsFailed: Boolean(error), timedOut });

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 2500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: "default" }} />
    </SafeAreaProvider>
  );
}
