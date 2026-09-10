import { useSignUp } from "@clerk/expo/legacy";
import { light } from "@repo/design-tokens";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "@/components/themed";

/**
 * Sign-up with email verification (M08-T02) — Clerk's standard
 * create → prepareEmailAddressVerification → attemptEmailAddressVerification
 * flow. Two-stage screen (form, then a code field) rather than two
 * routes, matching Clerk's own Expo quickstart example. Imports from
 * `@clerk/expo/legacy` — see sign-in.tsx's own comment for why.
 */
export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSignUp = async () => {
    if (!isLoaded) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await signUp.create({ emailAddress: email, password });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao criar conta."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerify = async () => {
    if (!isLoaded) {
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const attempt = await signUp.attemptEmailAddressVerification({ code });
      if (attempt.status === "complete") {
        await setActive({ session: attempt.createdSessionId });
        router.replace("/(tabs)");
      } else {
        setError(`Etapa adicional necessária: ${attempt.status}`);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Código inválido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (pendingVerification) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Confirme seu e-mail</Text>
        <TextInput
          keyboardType="number-pad"
          onChangeText={setCode}
          placeholder="Código de verificação"
          style={styles.input}
          value={code}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <TouchableOpacity
          disabled={isSubmitting}
          onPress={onVerify}
          style={styles.button}
        >
          {isSubmitting ? (
            <ActivityIndicator color={light.color.background} />
          ) : (
            <Text style={styles.buttonText}>Confirmar</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Criar conta</Text>
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
        onPress={onSignUp}
        style={styles.button}
      >
        {isSubmitting ? (
          <ActivityIndicator color={light.color.background} />
        ) : (
          <Text style={styles.buttonText}>Cadastrar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 24 },
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
  error: { color: light.color.status.error },
});
