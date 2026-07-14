import { View, Text, StyleSheet, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function AnalysisScreen() {
  const { user } = useAuth();
  const topicStats = user?.topicStats || [];

  // Weakest first — that's what deserves attention.
  const sorted = [...topicStats].sort((a, b) => a.accuracy - b.accuracy);
  const weak = sorted.filter((t) => t.accuracy < 60);
  const strong = sorted.filter((t) => t.accuracy >= 60);
  const overall =
    topicStats.length > 0 ? Math.round(topicStats.reduce((s, t) => s + t.accuracy, 0) / topicStats.length) : 0;

  return (
    <FlatList
      style={styles.container}
      data={sorted}
      keyExtractor={(item, idx) => `${item.subject}-${item.topic}-${idx}`}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      ListHeaderComponent={
        <View>
          <Text style={styles.title}>My Analysis</Text>
          <Text style={styles.subtitle}>Where you're strong, and where the marks are leaking</Text>

          {topicStats.length > 0 && (
            <>
              <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.overallCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.overallLabel}>OVERALL ACCURACY</Text>
                  <Text style={styles.overallValue}>{overall}%</Text>
                  <Text style={styles.overallSub}>across {topicStats.length} topics</Text>
                </View>
                <View style={styles.splitBox}>
                  <View style={styles.splitItem}>
                    <Text style={styles.splitValue}>{strong.length}</Text>
                    <Text style={styles.splitLabel}>Strong</Text>
                  </View>
                  <View style={styles.splitDivider} />
                  <View style={styles.splitItem}>
                    <Text style={styles.splitValue}>{weak.length}</Text>
                    <Text style={styles.splitLabel}>Weak</Text>
                  </View>
                </View>
              </LinearGradient>

              {weak.length > 0 && (
                <View style={styles.tipBox}>
                  <Ionicons name="bulb" size={15} color={colors.warn} />
                  <Text style={styles.tipText}>
                    Focus on the {weak.length} weakest {weak.length === 1 ? "topic" : "topics"} first — that's where
                    you'll gain the most marks.
                  </Text>
                </View>
              )}

              <Text style={styles.sectionTitle}>All topics</Text>
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="stats-chart-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>No data yet</Text>
          <Text style={styles.emptyText}>Take a few tests and your topic-wise breakdown will appear here</Text>
        </View>
      }
      renderItem={({ item }) => {
        const tint =
          item.accuracy >= 75
            ? colors.success
            : item.accuracy >= 60
            ? colors.medium
            : item.accuracy >= 40
            ? colors.hard
            : colors.danger;

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
                <View style={[styles.barFill, { width: `${Math.max(item.accuracy, 2)}%`, backgroundColor: tint }]} />
              </View>
            </View>

            <View style={[styles.badge, { backgroundColor: `${tint}14` }]}>
              <Text style={[styles.badgeText, { color: tint }]}>{item.accuracy}%</Text>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  title: { ...type.h1, color: colors.ink, marginTop: 6 },
  subtitle: { ...type.small, color: colors.slate, marginTop: 4, marginBottom: spacing.md },

  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadow.brand,
  },
  overallLabel: { ...type.micro, color: "rgba(255,255,255,0.7)" },
  overallValue: { fontSize: 32, fontWeight: "800", color: "#fff", marginTop: 3, letterSpacing: -0.6 },
  overallSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  splitBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: radius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  splitItem: { alignItems: "center" },
  splitValue: { fontSize: 18, fontWeight: "800", color: "#fff" },
  splitLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)", fontWeight: "600", marginTop: 1 },
  splitDivider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.2)" },

  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.warnLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.warnBorder,
  },
  tipText: { flex: 1, ...type.small, color: "#92400E", lineHeight: 18 },

  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: 12 },

  row: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, marginBottom: 10 },
  topic: { ...type.bodyStrong, color: colors.ink },
  subject: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 2, marginBottom: 8 },
  barBg: { height: 6, backgroundColor: colors.slateLight, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },

  badge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.full, minWidth: 52, alignItems: "center" },
  badgeText: { fontSize: 13, fontWeight: "800" },

  empty: { alignItems: "center", paddingVertical: 70, gap: 10 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { ...type.h3, color: colors.ink },
  emptyText: { ...type.small, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.xl },
});
