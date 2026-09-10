import { useAuth } from "@clerk/expo";
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
  fetchProjects,
  type MobileProject,
} from "@/src/features/projects/client";

/**
 * Projetos (M21, replaces the M08 PlaceholderScreen). Read-only list —
 * mirrors apps/app's /projects page's own query. Creating a project
 * remains web-only for now: a real, disclosed scope cut (see
 * PRODUCT_AUDIT.md), not an oversight.
 */
export default function ProjectsScreen() {
  const { getToken } = useAuth();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [projects, setProjects] = useState<readonly MobileProject[]>([]);
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: getToken is stable per Clerk's own contract.
  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Sem sessão ativa.");
      }
      setProjects(await fetchProjects(token));
      setStatus("ready");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao carregar projetos."
      );
      setStatus("error");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Projetos</Text>

      {status === "loading" && <ActivityIndicator style={styles.spinner} />}
      {status === "error" && (
        <View style={styles.center}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      )}
      {status === "ready" && projects.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum projeto ainda.</Text>
        </View>
      )}
      {status === "ready" && projects.length > 0 && (
        <FlatList
          contentContainerStyle={styles.list}
          data={projects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              {item.description && (
                <Text style={styles.cardBody}>{item.description}</Text>
              )}
              <View style={styles.badges}>
                <Text style={styles.legendItem}>{item.taskCount} tarefas</Text>
                <Text style={styles.legendItem}>
                  {item.deliverableCount} entregáveis
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  spinner: { marginTop: 24 },
  center: { padding: 8, gap: 12, alignItems: "flex-start" },
  emptyText: { fontSize: 15, opacity: 0.7 },
  error: { color: "#c0392b" },
  retryButton: {
    backgroundColor: "#111",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  retryButtonText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  list: { gap: 12 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardBody: { fontSize: 14, opacity: 0.8 },
  badges: { flexDirection: "row", gap: 8, marginTop: 4 },
  legendItem: {
    fontSize: 11,
    opacity: 0.7,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});
