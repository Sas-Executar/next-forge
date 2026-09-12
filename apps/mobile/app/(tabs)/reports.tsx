import { useAuth } from "@clerk/expo";
import { light } from "@repo/design-tokens";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "@/components/themed";
import {
  fetchReports,
  generateReport,
  type MobileReport,
} from "@/src/features/reports/client";

/**
 * Reports (M21, replaces the M08 PlaceholderScreen) — read-only history
 * + "Gerar relatório", mirroring apps/app's /reports page (read) and
 * its GenerateReportButton (write).
 */
export default function ReportsScreen() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [reports, setReports] = useState<readonly MobileReport[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: getToken is stable per Clerk's own contract.
  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Sem sessão ativa.");
      }
      setReports(await fetchReports(token));
      setStatus("ready");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Falha ao carregar relatórios."
      );
      setStatus("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Sem sessão ativa.");
      }
      await generateReport(token);
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao gerar relatório."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity
          disabled={generating}
          onPress={onGenerate}
          style={styles.generateButton}
        >
          {generating ? (
            <ActivityIndicator color={light.color.background} />
          ) : (
            <Text style={styles.generateButtonText}>Gerar relatório</Text>
          )}
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {status === "loading" && <ActivityIndicator style={styles.spinner} />}
      {status === "ready" && reports.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum relatório ainda.</Text>
        </View>
      )}
      {status === "ready" && reports.length > 0 && (
        <FlatList
          contentContainerStyle={styles.list}
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {new Date(item.generatedAt).toLocaleString("pt-BR")}
                </Text>
                <Text style={styles.badge}>{item.status}</Text>
              </View>
              <Text style={styles.cardSubtitle}>
                {item.progress.project_percent}% concluído ·{" "}
                {item.progress.today_delta} evidência(s) hoje.
              </Text>
              <Text style={styles.cardBody}>
                Problema: {item.properties.problem}
              </Text>
              <Text style={styles.cardBody}>Risco: {item.properties.risk}</Text>
              <Text style={styles.cardBody}>
                Próximas:{" "}
                {[
                  item.properties.next_1,
                  item.properties.next_2,
                  item.properties.next_3,
                ]
                  .filter((next): next is string => next !== null)
                  .join(" · ") || "—"}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 22, fontWeight: "700" },
  generateButton: {
    backgroundColor: light.color.action.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  generateButtonText: {
    color: light.color.background,
    fontWeight: "600",
    fontSize: 13,
  },
  spinner: { marginTop: 24 },
  center: { padding: 8 },
  emptyText: { fontSize: 15, opacity: 0.7 },
  error: { color: light.color.status.error },
  list: { gap: 12 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, opacity: 0.7 },
  cardBody: { fontSize: 13 },
  badge: {
    fontSize: 11,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
