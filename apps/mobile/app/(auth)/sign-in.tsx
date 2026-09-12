import { useSignIn } from "@clerk/expo/legacy";
import { light } from "@repo/design-tokens";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "@/components/themed";

/**
 * Email/password sign-in (M08-T02) — the same Clerk instance
 * apps/app's web sign-in uses, real useSignIn() flow (signIn.create →
 * setActive on success). Imports from `@clerk/expo/legacy`, not the
 * package's own default `@clerk/expo` export: the current default API
 * (Clerk's "Core 3") replaced this hook with a signals-based
 * `SignInFutureResource`, a materially different shape — `legacy` is
 * Clerk's own supported compatibility re-export
 * (@clerk/react/legacy), not a deprecated fallback.
 */
export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignIn = async () => {
    if (!isLoaded) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const attempt = await signIn.create({ identifier: email, password });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        // Clerk supports multi-step sign-in (MFA, etc.) — this app
        // doesn't implement the additional steps yet, so an
        // incomplete attempt is surfaced honestly rather than
        // silently retried.
        setError(`Etapa adicional necessária: ${attempt.status}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Falha ao entrar.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>EXECUTAR</Text>
      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="E-mail"
        style={styles.input}
        value={email}
      />
      <TextInput
        onChangeText={setPassword}
        placeholder="Senha"
        secureTextEntry
        style={styles.input}
        value={password}
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity
        disabled={isSubmitting}
        onPress={onSignIn}
        style={styles.button}
      >
        {isSubmitting ? (
          <ActivityIndicator color={light.color.background} />
        ) : (
          <Text style={styles.buttonText}>Entrar</Text>
        )}
      </TouchableOpacity>
      <Link href="/(auth)/sign-up">
        <Text style={styles.link}>Criar conta</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    padding: 12,
  },
  button: {
    backgroundColor: light.color.action.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: light.color.background, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 16, textDecorationLine: "underline" },
  error: { color: light.color.status.error },
});
