import { useAuth } from "@clerk/expo";
import { light } from "@repo/design-tokens";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "@/components/themed";
import {
  type MobileCopilotCommandId,
  type OrchestratorOutput,
  runCommand,
} from "@/src/features/copilot/client";

const COMMANDS: { id: MobileCopilotCommandId; label: string }[] = [
  { id: "bomdia", label: "/bomdia" },
  { id: "agora", label: "/agora" },
  { id: "estado", label: "/estado" },
  { id: "fechardia", label: "/fechardia" },
];

/**
 * Copiloto (M21, replaces the M08 PlaceholderScreen) — the 4 fixed
 * commands only (/replanejamento and free-form AI chat are a disclosed
 * M21 scope cut, see apps/api/app/copilot/command/route.ts's own
 * comment). Deterministic, no OPENAI_API_KEY needed.
 */
export default function CopilotScreen() {
  const { getToken } = useAuth();
  const [running, setRunning] = useState<MobileCopilotCommandId | null>(null);
  const [output, setOutput] = useState<OrchestratorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onRun = async (commandId: MobileCopilotCommandId) => {
    setRunning(commandId);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Sem sessão ativa.");
      }
      setOutput(await runCommand(commandId, token));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao rodar comando."
      );
    } finally {
      setRunning(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Copiloto</Text>
      <Text style={styles.disclosure}>
        /replanejamento e chat livre: apenas no web por enquanto.
      </Text>

      <View style={styles.commands}>
        {COMMANDS.map((command) => (
          <TouchableOpacity
            disabled={running !== null}
            key={command.id}
            onPress={() => onRun(command.id)}
            style={styles.commandButton}
          >
            {running === command.id ? (
              <ActivityIndicator color={light.color.background} />
            ) : (
              <Text style={styles.commandButtonText}>{command.label}</Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {output && (
        <View style={styles.output}>
          <Text style={styles.outputHeadline}>
            [{output.status}] {output.ui.headline}
          </Text>
          <Text style={styles.outputLine}>AGORA: {output.ui.agora}</Text>
          {output.ui.tempo && (
            <Text style={styles.outputLine}>TEMPO: {output.ui.tempo}</Text>
          )}
          {output.ui.conclui_quando && (
            <Text style={styles.outputLine}>
              CONCLUI QUANDO: {output.ui.conclui_quando}
            </Text>
          )}
          {output.ui.evidencia && (
            <Text style={styles.outputLine}>
              EVIDÊNCIA: {output.ui.evidencia}
            </Text>
          )}
          <Text style={styles.outputLine}>
            PRÓXIMA: {output.ui.proxima_acao}
          </Text>
          {output.warnings?.map((warning) => (
            <Text key={warning} style={styles.warning}>
              ⚠ {warning}
            </Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  disclosure: { fontSize: 12, opacity: 0.6 },
  commands: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  commandButton: {
    backgroundColor: light.color.action.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: "center",
  },
  commandButtonText: {
    color: light.color.background,
    fontWeight: "600",
    fontSize: 13,
  },
  error: { color: light.color.status.error },
  output: {
    padding: 16,
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    gap: 6,
  },
  outputHeadline: { fontSize: 16, fontWeight: "700" },
  outputLine: { fontSize: 14 },
  warning: { fontSize: 13, color: light.color.status.warning },
});
