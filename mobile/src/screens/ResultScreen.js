import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

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

  // Tone the result to how they actually did — honest, not falsely cheerful.
  const verdict =
    pct >= 80
      ? { icon: "trophy", tint: "#B45309", bg: "#FFFBEB", title: "Shandaar!", note: "Aap exam-ready ho rahe ho." }
      : pct >= 60
      ? { icon: "trending-up", tint: colors.success, bg: colors.successLight, title: "Achha kiya!", note: "Thoda aur mehnat, aur top pe honge." }
      : pct >= 40
      ? { icon: "fitness", tint: "#EA580C", bg: "#FFF7ED", title: "Practice jaari rakho", note: "Galtiyan dekho, wahi sabse bada teacher hai." }
      : { icon: "book", tint: colors.danger, bg: colors.dangerLight, title: "Basics pe kaam karo", note: "Neeche galtiyan padho — wahi se sudhaar shuru hoga." };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
      {/* Score hero */}
      <View style={styles.scoreCard}>
        <View style={[styles.verdictPill, { backgroundColor: verdict.bg }]}>
          <Ionicons name={verdict.icon} size={14} color={verdict.tint} />
          <Text style={[styles.verdictText, { color: verdict.tint }]}>{verdict.title}</Text>
        </View>

        <Text style={styles.scoreValue}>{attempt.score}</Text>
        <Text style={styles.scoreOutOf}>out of {attempt.totalMarks}</Text>

        <View style={styles.pctBarBg}>
          <View style={[styles.pctBarFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctLabel}>{pct}% score</Text>

        <View style={styles.statsRow}>
          <Stat icon="checkmark-circle" label="Correct" value={attempt.correctCount} color={colors.success} />
          <Stat icon="close-circle" label="Wrong" value={attempt.wrongCount} color={colors.danger} />
          <Stat icon="remove-circle" label="Skipped" value={attempt.skippedCount} color={colors.slate} />
        </View>

        {attempt.rank ? (
          <View style={styles.rankBadge}>
            <Ionicons name="podium" size={13} color={colors.brand} />
            <Text style={styles.rankText}>
              Rank #{attempt.rank}
              {attempt.percentile ? ` · ${attempt.percentile} percentile` : ""}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Insight */}
      {insight?.note ? (
        <View style={styles.insightCard}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb" size={16} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.insightTitle}>Speed vs Accuracy</Text>
            <Text style={styles.insightText}>{insight.note}</Text>
          </View>
        </View>
      ) : null}

      {/* Wrong answers */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Galtiyon Se Seekho</Text>
        {wrongAnswers.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{wrongAnswers.length}</Text>
          </View>
        )}
      </View>

      {wrongAnswers.length === 0 ? (
        <View style={styles.allCorrectBox}>
          <Ionicons name="checkmark-done-circle" size={32} color={colors.success} />
          <Text style={styles.allCorrectText}>Koi galat answer nahi — bahut badhiya!</Text>
        </View>
      ) : (
        wrongAnswers.map((a, idx) => (
          <View key={idx} style={styles.wrongCard}>
            <Text style={styles.wrongQuestion}>
              <Text style={styles.qNum}>Q{idx + 1}. </Text>
              {a.question.text}
            </Text>

            <View style={styles.answerRow}>
              <Ionicons name="close-circle" size={15} color={colors.danger} />
              <Text style={styles.answerLabel}>Aapka jawab:</Text>
              <Text style={styles.wrongAnswerText}>{a.question.options[a.selectedIndex]}</Text>
            </View>

            <View style={styles.answerRow}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.answerLabel}>Sahi jawab:</Text>
              <Text style={styles.correctAnswerText}>{a.question.options[a.question.correctIndex]}</Text>
            </View>

            {a.question.solution ? (
              <View style={styles.solutionBox}>
                <Text style={styles.solutionLabel}>Solution</Text>
                <Text style={styles.solutionText}>{a.question.solution}</Text>
              </View>
            ) : null}
          </View>
        ))
      )}

      {/* Actions */}
      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Analysis")} activeOpacity={0.85}>
        <Ionicons name="stats-chart" size={17} color="#fff" />
        <Text style={styles.primaryButtonText}>Poora Analysis Dekho</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Home")} activeOpacity={0.7}>
        <Text style={styles.secondaryButtonText}>Home Par Wapas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateLight },

  scoreCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  verdictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: spacing.md,
  },
  verdictText: { fontSize: 12, fontWeight: "800" },
  scoreValue: { fontSize: 46, fontWeight: "800", color: colors.ink, lineHeight: 52 },
  scoreOutOf: { fontSize: 13, color: colors.slate, marginBottom: spacing.md },

  pctBarBg: {
    width: "100%",
    height: 8,
    backgroundColor: colors.slateLight,
    borderRadius: 4,
    overflow: "hidden",
  },
  pctBarFill: { height: 8, backgroundColor: colors.brand, borderRadius: 4 },
  pctLabel: { fontSize: 12, color: colors.slate, marginTop: 6, marginBottom: spacing.md },

  statsRow: { flexDirection: "row", width: "100%", justifyContent: "space-around", marginTop: spacing.sm },
  stat: { alignItems: "center", gap: 3 },
  statValue: { fontSize: 19, fontWeight: "800" },
  statLabel: { fontSize: 11, color: colors.slate },

  rankBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    marginTop: spacing.md,
  },
  rankText: { fontSize: 12, fontWeight: "700", color: colors.brand },

  insightCard: {
    flexDirection: "row",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  insightTitle: { fontSize: 13, fontWeight: "700", color: colors.ink },
  insightText: { fontSize: 12, color: colors.slate, marginTop: 2, lineHeight: 17 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
  countBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  countBadgeText: { fontSize: 11, fontWeight: "800", color: colors.danger },

  allCorrectBox: {
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  allCorrectText: { fontSize: 14, fontWeight: "700", color: colors.success },

  wrongCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
  },
  wrongQuestion: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: spacing.sm, lineHeight: 20 },
  qNum: { color: colors.slate, fontWeight: "700" },

  answerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 4, flexWrap: "wrap" },
  answerLabel: { fontSize: 12, color: colors.slate },
  wrongAnswerText: { fontSize: 12, fontWeight: "700", color: colors.danger, flex: 1 },
  correctAnswerText: { fontSize: 12, fontWeight: "700", color: colors.success, flex: 1 },

  solutionBox: {
    backgroundColor: colors.slateLight,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  solutionLabel: { fontSize: 10, fontWeight: "800", color: colors.slate, marginBottom: 3, letterSpacing: 0.4 },
  solutionText: { fontSize: 12, color: colors.ink, lineHeight: 18 },

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  primaryButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  secondaryButton: { alignItems: "center", paddingVertical: spacing.md },
  secondaryButtonText: { color: colors.slate, fontSize: 14, fontWeight: "600" },
});