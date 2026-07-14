import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function ResultScreen({ route, navigation }) {
  const { attemptId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const res = await api.get(`/tests/attempts/${attemptId}`);
      setData(res.data);
    } catch (err) {
      // stays in failed state
    } finally {
      setLoading(false);
    }
  }

  if (loading || !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const { attempt, insight } = data;
  const wrongAnswers = attempt.answers.filter((a) => a.question && !a.isCorrect && a.selectedIndex !== null);
  const pct = attempt.totalMarks > 0 ? Math.round((attempt.score / attempt.totalMarks) * 100) : 0;

  // Honest feedback — a low score should not be dressed up as a win.
  const verdict =
    pct >= 80
      ? { grad: gradients.success, icon: "trophy", title: "Excellent", note: "You're tracking well for the real exam." }
      : pct >= 60
      ? { grad: gradients.brand, icon: "trending-up", title: "Good progress", note: "Close the gaps below and you'll be there." }
      : pct >= 40
      ? { grad: ["#FB923C", "#EA580C"], icon: "fitness", title: "Keep working", note: "Your mistakes below are the fastest way up." }
      : { grad: gradients.danger, icon: "book", title: "Back to basics", note: "Study the solutions below before the next attempt." };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Score hero */}
      <LinearGradient colors={verdict.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.scoreCard}>
        <View style={styles.ring} />

        <View style={styles.verdictPill}>
          <Ionicons name={verdict.icon} size={13} color="#fff" />
          <Text style={styles.verdictText}>{verdict.title}</Text>
        </View>

        <View style={styles.scoreRow}>
          <Text style={styles.scoreValue}>{attempt.score}</Text>
          <Text style={styles.scoreOutOf}>/ {attempt.totalMarks}</Text>
        </View>
        <Text style={styles.verdictNote}>{verdict.note}</Text>

        <View style={styles.pctBarBg}>
          <View style={[styles.pctBarFill, { width: `${Math.max(pct, 2)}%` }]} />
        </View>
        <Text style={styles.pctLabel}>{pct}% score</Text>

        {attempt.rank ? (
          <View style={styles.rankBadge}>
            <Ionicons name="podium" size={12} color="#fff" />
            <Text style={styles.rankText}>
              Rank #{attempt.rank}
              {attempt.percentile ? ` · ${attempt.percentile} percentile` : ""}
            </Text>
          </View>
        ) : null}
      </LinearGradient>

      {/* Breakdown */}
      <View style={styles.statsRow}>
        <Stat icon="checkmark-circle" label="Correct" value={attempt.correctCount} tint={colors.success} bg={colors.successLight} />
        <Stat icon="close-circle" label="Wrong" value={attempt.wrongCount} tint={colors.danger} bg={colors.dangerLight} />
        <Stat icon="remove-circle" label="Skipped" value={attempt.skippedCount} tint={colors.slate} bg={colors.slateLight} />
      </View>

      {/* Insight */}
      {insight?.note ? (
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb" size={15} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Speed vs accuracy</Text>
            <Text style={styles.insightText}>{insight.note}</Text>
          </View>
        </View>
      ) : null}

      {/* Mistakes */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Learn from mistakes</Text>
        {wrongAnswers.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{wrongAnswers.length}</Text>
          </View>
        )}
      </View>

      {wrongAnswers.length === 0 ? (
        <View style={styles.allCorrectBox}>
          <Ionicons name="checkmark-done-circle" size={30} color={colors.success} />
          <Text style={styles.allCorrectText}>No wrong answers — outstanding work</Text>
        </View>
      ) : (
        wrongAnswers.map((a, idx) => (
          <View key={idx} style={styles.wrongCard}>
            <Text style={styles.wrongQuestion}>
              <Text style={styles.qNum}>Q{idx + 1}. </Text>
              {a.question.text}
            </Text>

            <View style={styles.answerBox}>
              <View style={styles.answerRow}>
                <Ionicons name="close-circle" size={14} color={colors.danger} />
                <Text style={styles.answerLabel}>You chose</Text>
                <Text style={styles.wrongAnswerText} numberOfLines={2}>
                  {a.question.options[a.selectedIndex]}
                </Text>
              </View>

              <View style={styles.answerDivider} />

              <View style={styles.answerRow}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.answerLabel}>Correct</Text>
                <Text style={styles.correctAnswerText} numberOfLines={2}>
                  {a.question.options[a.question.correctIndex]}
                </Text>
              </View>
            </View>

            {a.question.solution ? (
              <View style={styles.solutionBox}>
                <View style={styles.solutionHeader}>
                  <Ionicons name="bulb-outline" size={12} color={colors.brand} />
                  <Text style={styles.solutionLabel}>SOLUTION</Text>
                </View>
                <Text style={styles.solutionText}>{a.question.solution}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}

      {/* Actions */}
      <TouchableOpacity onPress={() => navigation.navigate("Analysis")} activeOpacity={0.85} style={{ marginTop: spacing.md }}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.primaryButton}>
          <Ionicons name="stats-chart" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>View Full Analysis</Text>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Home")} activeOpacity={0.7}>
        <Text style={styles.secondaryButtonText}>Back to Home</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ icon, label, value, tint, bg }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  scoreCard: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow.lg,
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 28,
    borderColor: "rgba(255,255,255,0.06)",
    top: -80,
    right: -60,
  },
  verdictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  verdictText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  scoreRow: { flexDirection: "row", alignItems: "baseline", marginTop: spacing.md },
  scoreValue: { fontSize: 52, fontWeight: "800", color: "#fff", lineHeight: 58, letterSpacing: -1 },
  scoreOutOf: { fontSize: 17, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginLeft: 5 },
  verdictNote: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginTop: 4, marginBottom: spacing.md },

  pctBarBg: { width: "100%", height: 7, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 4, overflow: "hidden" },
  pctBarFill: { height: 7, backgroundColor: "#fff", borderRadius: 4 },
  pctLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 7, fontWeight: "600" },

  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  rankText: { fontSize: 12, fontWeight: "700", color: "#fff" },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
  stat: { ...card, flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 20, fontWeight: "800", marginTop: 6 },
  statLabel: { ...type.tiny, color: colors.slateSoft, fontWeight: "600", marginTop: 1 },

  insightCard: { ...card, flexDirection: "row", gap: 10, padding: spacing.md, marginBottom: spacing.lg },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: { ...type.bodyStrong, color: colors.ink, fontSize: 13 },
  insightText: { ...type.small, color: colors.slate, marginTop: 2, lineHeight: 18 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { ...type.h2, color: colors.ink },
  countBadge: { backgroundColor: colors.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  countBadgeText: { fontSize: 11, fontWeight: "800", color: colors.danger },

  allCorrectBox: {
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  allCorrectText: { ...type.bodyStrong, color: colors.success },

  wrongCard: { ...card, padding: spacing.md, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: colors.danger },
  wrongQuestion: { ...type.body, fontWeight: "600", color: colors.ink, marginBottom: 12, lineHeight: 21 },
  qNum: { color: colors.slateSoft, fontWeight: "800" },

  answerBox: { backgroundColor: colors.bg, borderRadius: radius.md, padding: 12 },
  answerRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  answerLabel: { ...type.tiny, color: colors.slateSoft, fontWeight: "600", width: 52 },
  wrongAnswerText: { flex: 1, ...type.small, fontWeight: "700", color: colors.danger },
  correctAnswerText: { flex: 1, ...type.small, fontWeight: "700", color: colors.success },
  answerDivider: { height: 1, backgroundColor: colors.border, marginVertical: 9 },

  solutionBox: { backgroundColor: colors.brandTint, borderRadius: radius.md, padding: 12, marginTop: 10, borderWidth: 1, borderColor: colors.brandLight },
  solutionHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 5 },
  solutionLabel: { ...type.micro, color: colors.brand },
  solutionText: { ...type.small, color: colors.inkSoft, lineHeight: 19 },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: radius.md,
    ...shadow.brand,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryButton: { alignItems: "center", paddingVertical: spacing.md },
  secondaryButtonText: { color: colors.slate, ...type.bodyStrong },
});
