import { useAuth } from "@clerk/expo";
import { light } from "@repo/design-tokens";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Text, View } from "@/components/themed";
import {
  fetchProjection,
  PROJECTION_IDS,
  type ProjectionId,
} from "@/src/features/mapa-os/client";

const PROJECTION_LABEL: Record<ProjectionId, string> = {
  mapa_operacional: "Operacional",
  agora_proximo_depois: "Agora/Próximo/Depois",
  status_terminal: "Status terminal",
  prisma_7d: "Prisma 7d",
};

/**
 * Mapa-OS (M21, replaces the M08 PlaceholderScreen) — the same 4
 * projections apps/app's /mapa-os page renders, same field selection,
 * just RN Text/View instead of Card/Badge. No print/export link (no
 * print target on mobile) — a disclosed, not silent, scope cut.
 */
export default function MapaOsScreen() {
  const { getToken } = useAuth();
  const [projection, setProjection] =
    useState<ProjectionId>("mapa_operacional");
  const [authorized, setAuthorized] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  // biome-ignore lint/suspicious/noExplicitAny: 4 distinct payload shapes per projection
  const [data, setData] = useState<any>(null);
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
      setData(await fetchProjection(projection, { authorized }, token));
      setStatus("ready");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Falha ao carregar projeção."
      );
      setStatus("error");
    }
  }, [projection, authorized]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Mapa-OS</Text>
      <Text style={styles.subtitle}>
        Projeção analógica da fonte canônica — não cria um segundo estado do
        projeto.
      </Text>

      <View style={styles.toggle}>
        {PROJECTION_IDS.map((id) => (
          <TouchableOpacity
            key={id}
            onPress={() => {
              setAuthorized(false);
              setProjection(id);
            }}
            style={[
              styles.toggleButton,
              projection === id && styles.toggleButtonActive,
            ]}
          >
            <Text
              style={[
                styles.toggleButtonText,
                projection === id && styles.toggleButtonTextActive,
              ]}
            >
              {PROJECTION_LABEL[id]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {status === "loading" && <ActivityIndicator style={styles.spinner} />}
      {status === "error" && <Text style={styles.error}>{error}</Text>}

      {status === "ready" && projection === "mapa_operacional" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{data.position}</Text>
          <Text style={styles.cardSubtitle}>
            {data.sustainedProgressPct}% concluído
          </Text>
          <Text style={styles.line}>
            {data.evidenceQuestion}{" "}
            {data.evidenceExists ? "Sim." : "Ainda não."}
          </Text>
          <Text style={styles.line}>
            Bloqueios:{" "}
            {data.blockers.length > 0 ? data.blockers.join(", ") : "Nenhum."}
          </Text>
          <Text style={styles.line}>
            Próximo: {data.proximo.length > 0 ? data.proximo.join(", ") : "—"}
          </Text>
          <Text style={styles.line}>
            Depois: {data.depois.length > 0 ? data.depois.join(", ") : "—"}
          </Text>
        </View>
      )}

      {status === "ready" && projection === "agora_proximo_depois" && (
        <View style={styles.stack}>
          {(["agora", "proximo", "depois"] as const).map((horizon) => {
            let items: { title: string; state: string }[];
            if (horizon === "agora") {
              items = data.agora ? [data.agora] : [];
            } else {
              items = data[horizon];
            }
            return (
              <View key={horizon} style={styles.card}>
                <Text style={styles.cardTitle}>{horizon}</Text>
                {items.length === 0 ? (
                  <Text style={styles.line}>Nada.</Text>
                ) : (
                  // biome-ignore lint/suspicious/noExplicitAny: mixed horizon item shapes
                  items.map((item: any) => (
                    <Text key={item.title} style={styles.line}>
                      {item.title} — {item.state}
                    </Text>
                  ))
                )}
              </View>
            );
          })}
        </View>
      )}

      {status === "ready" && projection === "status_terminal" && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {data.header}{" "}
            {data.tags.length > 0 ? `(${data.tags.join(", ")})` : ""}
          </Text>
          <Text style={styles.cardSubtitle}>{data.position}</Text>
          <Text style={styles.line}>Problema: {data.threePN.problem}</Text>
          <Text style={styles.line}>Processo: {data.threePN.process}</Text>
          <Text style={styles.line}>Progresso: {data.threePN.progress}</Text>
          <Text style={styles.line}>
            Próximas: {data.threePN.next.join(" · ") || "—"}
          </Text>
          <Text style={styles.line}>Risco: {data.risk}</Text>
          <Text style={styles.line}>Prevenção: {data.prevention}</Text>
          <Text style={styles.line}>Evidências: {data.evidenceCount}</Text>
        </View>
      )}

      {status === "ready" &&
        projection === "prisma_7d" &&
        data?.kind === "INSUFFICIENT_DATA" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Dados insuficientes para os 7 dias
            </Text>
            <Text style={styles.cardSubtitle}>{data.reason}</Text>
            <TouchableOpacity
              onPress={() => setAuthorized(true)}
              style={styles.authorizeButton}
            >
              <Text style={styles.authorizeButtonText}>
                Autorizar mesmo assim
              </Text>
            </TouchableOpacity>
          </View>
        )}

      {status === "ready" &&
        projection === "prisma_7d" &&
        data?.kind === "OK" && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{data.payload.epic.title}</Text>
            <Text style={styles.cardSubtitle}>
              {data.payload.epic.progressPct} · {data.payload.calendar.period}
            </Text>
            <View style={styles.kpiGrid}>
              {/* biome-ignore lint/suspicious/noExplicitAny: PrismaKpi shape */}
              {data.payload.epic.kpis.map((kpi: any) => (
                <View key={kpi.label} style={styles.kpi}>
                  <Text style={styles.kpiLabel}>{kpi.label}</Text>
                  <Text style={styles.kpiValue}>{kpi.value}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.line}>
              Destaque: {data.payload.result.heroTitle}
            </Text>
            <Text style={styles.line}>
              Próximo: {data.payload.result.nextValue}
            </Text>
          </View>
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 13, opacity: 0.7 },
  toggle: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  toggleButton: {
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  toggleButtonActive: {
    backgroundColor: light.color.action.primary,
    borderColor: light.color.action.primary,
  },
  toggleButtonText: { fontSize: 12 },
  toggleButtonTextActive: { color: light.color.background },
  spinner: { marginTop: 24 },
  error: { color: light.color.status.error },
  stack: { gap: 12 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 8,
    gap: 6,
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, opacity: 0.7 },
  line: { fontSize: 13 },
  authorizeButton: { marginTop: 8 },
  authorizeButtonText: {
    color: light.color.focus,
    textDecorationLine: "underline",
  },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpi: {
    borderWidth: 1,
    borderColor: light.color.border,
    borderRadius: 6,
    padding: 8,
    minWidth: 72,
  },
  kpiLabel: { fontSize: 11, opacity: 0.7 },
  kpiValue: { fontSize: 14, fontWeight: "700" },
});
