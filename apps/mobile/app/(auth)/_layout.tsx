import { Stack } from "expo-router";

/**
 * (auth) group — only reachable while signed out, per the root
 * layout's Stack.Protected guard. No header: sign-in/sign-up own their
 * whole screen.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}
