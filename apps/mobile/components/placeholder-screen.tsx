import { StyleSheet } from "react-native";
import { Text, View } from "./themed";

/**
 * Shared shell for the M08-T04 nav tabs that don't have a live data
 * source yet. This repo's domain data (Task/Project/StatusReport/...)
 * is only reachable today via Next.js Server Actions and RSC data
 * fetching (apps/app) — neither is callable from a React Native
 * client. Wiring a real mobile data layer (a REST/tRPC surface on
 * apps/api, or GraphQL) is out of M08's scope (the plan's own DoD for
 * this milestone is "sign-in works" + "a dev client builds", not live
 * data) — disclosed here rather than faking screen content.
 */
export const PlaceholderScreen = ({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) => (
  <View style={styles.container}>
    <Text style={styles.title}>{title}</Text>
    <Text style={styles.description}>{description}</Text>
    <Text style={styles.gap}>
      Dados ainda não conectados neste app — a base de execução
      (Task/Project/Evidence) só é exposta hoje via Server Actions do apps/app.
      Uma API mobile real é trabalho de milestone futuro.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "700" },
  description: { fontSize: 15, opacity: 0.8 },
  gap: { fontSize: 13, opacity: 0.6, marginTop: 24 },
});
