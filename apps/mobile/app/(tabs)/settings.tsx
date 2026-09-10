import { useAuth, useUser } from "@clerk/expo";
import { useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "@/components/themed";
import { getExpoPushToken, registerDeviceForPush } from "@/src/push/register";

/**
 * Config tab (M08-T04) — account info, sign-out, and the real push
 * notification opt-in (M08-T03). Manual button rather than an
 * automatic on-launch registration: requesting notification permission
 * on first open is a poor pattern (per Apple/Google's own guidance —
 * ask in context), and this repo has no onboarding flow yet to place
 * it in.
 */
export default function SettingsScreen() {
  const { user } = useUser();
  const { signOut, getToken } = useAuth();
  const [pushStatus, setPushStatus] = useState<
    "idle" | "registering" | "registered" | "error"
  >("idle");
  const [pushError, setPushError] = useState<string | null>(null);

  const onEnablePush = async () => {
    setPushStatus("registering");
    setPushError(null);
    try {
      const expoPushToken = await getExpoPushToken();
      const sessionToken = await getToken();
      if (!sessionToken) {
        throw new Error("No active Clerk session token.");
      }
      await registerDeviceForPush(expoPushToken, sessionToken);
      setPushStatus("registered");
    } catch (caught) {
      setPushStatus("error");
      setPushError(
        caught instanceof Error
          ? caught.message
          : "Falha ao ativar notificações."
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Config</Text>
      <Text style={styles.email}>
        {user?.primaryEmailAddress?.emailAddress ?? "—"}
      </Text>

      <TouchableOpacity
        disabled={pushStatus === "registering" || pushStatus === "registered"}
        onPress={onEnablePush}
        style={styles.button}
      >
        {pushStatus === "registering" ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {pushStatus === "registered"
              ? "Notificações ativadas"
              : "Ativar notificações push"}
          </Text>
        )}
      </TouchableOpacity>
      {pushError && <Text style={styles.error}>{pushError}</Text>}

      <TouchableOpacity
        onPress={() => signOut()}
        style={[styles.button, styles.signOut]}
      >
        <Text style={styles.buttonText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  email: { fontSize: 15, opacity: 0.7, marginBottom: 24 },
  button: {
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
  },
  signOut: { backgroundColor: "#c0392b", marginTop: 24 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#c0392b" },
});
