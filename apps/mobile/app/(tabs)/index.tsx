import { dayRange } from "@repo/domain";
import { TASK_STATE_LABEL_PT, taskStateSchema } from "@repo/schemas";
import { StyleSheet } from "react-native";
import { PlaceholderScreen } from "@/components/placeholder-screen";
import { Text, View } from "@/components/themed";

/**
 * Agora (M08-T04, /now's mobile counterpart). No live Melhor Próxima
 * Ação data yet (see PlaceholderScreen's own comment), but this screen
 * does exercise the two workspace packages M08-T01 wires in for real:
 * @repo/domain's dayRange() computes the same UTC day boundary the web
 * app's /today uses, and @repo/schemas' TASK_STATE_LABEL_PT renders the
 * real canonical state vocabulary — proving the cross-package
 * TypeScript resolution and Metro's monorepo bundling both work, not
 * just fabricating filler content.
 */
export default function AgoraScreen() {
  const today = dayRange(0);

  return (
    <>
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
      <PlaceholderScreen
        description="A Melhor Próxima Ação (WIP=1), como em /now no web."
        title="Agora"
      />
    </>
  );
}

const styles = StyleSheet.create({
  today: { padding: 16, gap: 8 },
  todayLabel: { fontSize: 13, opacity: 0.6 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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
