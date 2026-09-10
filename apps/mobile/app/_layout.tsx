import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { hideAsync, preventAutoHideAsync } from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { useColorScheme } from "@/components/use-color-scheme";
import { env } from "@/env";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading and
// Clerk's initial auth check are both complete.
preventAutoHideAsync();

/**
 * Root layout (M08-T02). ClerkProvider wraps the whole app with the same
 * Clerk instance web uses (EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY — same
 * value space as apps/app's NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, just
 * re-prefixed per Expo's own env convention). tokenCache is Clerk's own
 * expo-secure-store-backed cache
 * (@clerk/expo/token-cache) — the real, current recommended
 * pattern, not a hand-rolled one.
 */
export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ClerkProvider
      publishableKey={env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <RootLayoutNav />
      </ClerkLoaded>
    </ClerkProvider>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { isSignedIn } = useAuth();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* Stack.Protected (expo-router's route-guard API) — the guard
         * is re-evaluated on every render, so signing in/out redirects
         * automatically without manual navigation calls. */}
        <Stack.Protected guard={Boolean(isSignedIn)}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!isSignedIn}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}
