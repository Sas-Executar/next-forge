import { useAuth } from "@clerk/expo";
import { light } from "@repo/design-tokens";
import { dayRange } from "@repo/domain";
import {
  TASK_STATE_LABEL_PT,
  TASK_STATE_TRANSITIONS,
  taskStateSchema,
} from "@repo/schemas";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "@/components/themed";
import {
  advanceTask,
  fetchNextAction,
  type NextActionResult,
} from "@/src/features/now/client";

/**
 * Agora (M21, replaces the M08 PlaceholderScreen — /now's mobile
 * counterpart). Real GET /now + POST /now/advance calls, same
 * TaskActions transition set as apps/app's own /now page
 * (TASK_STATE_TRANSITIONS from @repo/schemas). DONE always requires an
 * evidence description first — same "'feito' não substitui evidência"
 * invariant apps/api/app/now/advance/route.ts enforces server-side.
 */
export default function AgoraScreen() {
  const { getToken } = useAuth();
  const today = dayRange(0);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [result, setResult] = useState<NextActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evidenceOpenFor, setEvidenceOpenFor] = useState<string | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [advancing, setAdvancing] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: getToken is stable per Clerk's own contract.
  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Sem sessão ativa.");
      }
      const nextResult = await fetchNextAction(token);
      setResult(nextResult);
      setStatus("ready");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao carregar /now."
      );
      setStatus("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onAdvance = async (taskId: string, toState: string) => {
    const parsedState = taskStateSchema.parse(toState);
    if (parsedState === "DONE" && evidenceOpenFor !== taskId) {
      setEvidenceOpenFor(taskId);
      return;
    }
    setAdvancing(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Sem sessão ativa.");
      }
      await advanceTask(
        {
          taskId,
          toState: parsedState,
          evidence:
            parsedState === "DONE"
              ? { description: evidenceDescription, grade: "A_OBSERVADO" }
              : undefined,
        },
        token
      );
      setEvidenceOpenFor(null);
      setEvidenceDescription("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao avançar tarefa."
      );
    } finally {
      setAdvancing(false);
    }
  };

  const renderTaskActions = (taskId: string, taskState: string) => {
    const parsedState = taskStateSchema.parse(taskState);
    const transitions = TASK_STATE_TRANSITIONS[parsedState];
    return (
      <View style={styles.actions}>
        {transitions.map((toState) => (
          <TouchableOpacity
            disabled={advancing}
            key={toState}
            onPress={() => onAdvance(taskId, toState)}
            style={styles.actionButton}
          >
            <Text style={styles.actionButtonText}>
              {TASK_STATE_LABEL_PT[toState]}
            </Text>
          </TouchableOpacity>
        ))}
        {evidenceOpenFor === taskId && (
          <View style={styles.evidenceBox}>
            <TextInput
              onChangeText={setEvidenceDescription}
              placeholder="Descreva a evidência…"
              style={styles.evidenceInput}
              value={evidenceDescription}
            />
            <TouchableOpacity
              disabled={advancing || evidenceDescription.length === 0}
              onPress={() => onAdvance(taskId, "DONE")}
              style={styles.actionButton}
            >
              <Text style={styles.actionButtonText}>Confirmar conclusão</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.today}>
        <Text style={styles.todayLabel}>
          Hoje (UTC): {today.start.toLocaleDateString("pt-BR")}
        </Text>
        <View style={styles.legend}>
          {taskStateSchema.options.map((state) => (
            <Text key={state} style={styles.legendItem}>
              {TASK_STATE_LABEL_PT[state]}
            </Text>
          ))}
        </View>
      </View>

      {status === "loading" && <ActivityIndicator style={styles.spinner} />}
      {status === "error" && (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === "ready" && result?.kind === "NONE" && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nada elegível agora.</Text>
        </View>
      )}
      {status === "ready" && result?.kind === "SELECTED" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{result.task.title}</Text>
          <Text style={styles.cardSubtitle}>
            {TASK_STATE_LABEL_PT[result.task.state]} · {result.reason}
          </Text>
          {result.task.description && (
            <Text style={styles.cardBody}>{result.task.description}</Text>
          )}
          {renderTaskActions(result.task.id, result.task.state)}
        </View>
      )}
      {status === "ready" && result?.kind === "TIE" && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Empate — escolha manualmente:</Text>
          {result.candidates.map((task) => (
            <View key={task.id} style={styles.card}>
              <Text style={styles.cardTitle}>{task.title}</Text>
              <Text style={styles.cardSubtitle}>
                {TASK_STATE_LABEL_PT[task.state]}
              </Text>
              {renderTaskActions(task.id, task.state)}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  today: { padding: 16, gap: 8 },
  todayLabel: { fontSize: 13, opacity: 0.6 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  legendItem: {
    fontSize: 11,
    opacity: 0.7,
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  spinner: { marginTop: 24 },
  center: { padding: 24, gap: 12, alignItems: "flex-start" },
  emptyText: { fontSize: 15, opacity: 0.7 },
  error: { color: light.color.status.error },
  card: {
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    gap: 6,
  },
  cardTitle: { fontSize: 18, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, opacity: 0.7 },
  cardBody: { fontSize: 14 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  actionButton: {
    backgroundColor: light.color.action.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  actionButtonText: {
    color: light.color.background,
    fontWeight: "600",
    fontSize: 13,
  },
  evidenceBox: { width: "100%", gap: 8 },
  evidenceInput: {
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
});
