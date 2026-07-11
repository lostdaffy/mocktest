import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

export default function AnalysisScreen() {
  const { user } = useAuth();
  const topicStats = user?.topicStats || [];

  // Weakest first — that's what they should work on.
  const sorted = [...topicStats].sort((a, b) => a.accuracy - b.accuracy);

  const weak = sorted.filter((t) => t.accuracy < 60);
  const strong = sorted.filter((t) => t.accuracy >= 60);
  const overall =
    topicStats.length > 0
      ? Math.round(topicStats.reduce((sum, t) => sum + t.accuracy, 0) / topicStats.length)
      : 0;

  return (
    <FlatList
      style={styles.container}
      data={sorted}
      keyExtractor={(item, idx) => `${item.subject}-${item.topic}-${idx}`}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>My Analysis</Text>
          <Text style={styles.subtitle}>Topic-wise performance — jahan kamzor ho, wahan practice karo</Text>

          {topicStats.length > 0 && (
            <>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                  <Ionicons name="analytics" size={17} color={colors.brand} />
                  <Text style={styles.summaryValue}>{overall}%</Text>
                  <Text style={styles.summaryLabel}>Overall</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Ionicons name="alert-circle" size={17} color={colors.danger} />
                  <Text style={[styles.summaryValue, { color: colors.danger }]}>{weak.length}</Text>
                  <Text style={styles.summaryLabel}>Weak Topics</Text>
                </View>
                <View style={styles.summaryCard}>
                  <Ionicons name="checkmark-circle" size={17} color={colors.success} />
                  <Text style={[styles.summaryValue, { color: colors.success }]}>{strong.length}</Text>
                  <Text style={styles.summaryLabel}>Strong Topics</Text>
                </View>
              </View>

              {weak.length > 0 && (
                <View style={styles.tipBox}>
                  <Ionicons name="bulb" size={15} color="#B45309" />
                  <Text style={styles.tipText}>
                    Neeche ke {weak.length} topics pe sabse pehle kaam karo — sabse zyada fayda wahi denge.
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>Saare Topics</Text>
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="stats-chart-outline" size={40} color={colors.slate} />
          <Text style={styles.emptyTitle}>Abhi koi data nahi</Text>
          <Text style={styles.emptyText}>Kuch tests do — phir yahan aapki topic-wise performance dikhegi</Text>
        </View>
      }
      renderItem={({ item }) => {
        const tint = item.accuracy >= 75 ? colors.success : item.accuracy >= 60 ? "#0284C7" : item.accuracy >= 40 ? "#EA580C" : colors.danger;

        return (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.topic} numberOfLines={1}>
                {item.topic}
              </Text>
              <Text style={styles.subject}>
                {item.subject} · {item.attempted} attempted
              </Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${item.accuracy}%`, backgroundColor: tint }]} />
              </View>
            </View>

            <View style={[styles.badge, { backgroundColor: `${tint}15` }]}>
              <Text style={[styles.badgeText, { color: tint }]}>{item.accuracy}%</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },

  title: { fontSize: 21, fontWeight: "800", color: colors.ink, marginTop: 8 },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 4, marginBottom: spacing.md },

  summaryRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  summaryCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { fontSize: 19, fontWeight: "800", color: colors.ink, marginTop: 5 },
  summaryLabel: { fontSize: 10, color: colors.slate, marginTop: 2 },

  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFBEB",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  tipText: { flex: 1, fontSize: 12, color: "#92400E", lineHeight: 17 },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: spacing.sm },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topic: { fontSize: 14, fontWeight: "700", color: colors.ink },
  subject: { fontSize: 11, color: colors.slate, marginTop: 2, marginBottom: 7 },
  barBg: { height: 5, backgroundColor: colors.slateLight, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },

  badge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.full, minWidth: 50, alignItems: "center" },
  badgeText: { fontSize: 13, fontWeight: "800" },

  empty: { alignItems: "center", paddingVertical: 70, gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.lg },
});