import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, radius, spacing } from "../theme/theme";

// "Today's plan" - the first thing on Home.
//
// A student who opens the app should not have to work out what to do. Three
// steps, in order: the Daily GK Quiz (same 20 questions for everyone, so it
// has a rank), one practice test (the chapter they were on, or the first of
// their exam), and the week's mock. The next step has the one big button;
// finished steps show a tick - and the quiz shows where they ranked.

const ICONS = { quiz: "flash", practice: "book", mock: "document-text" };
const STREAK = "#EA580C";

export default function TodayPlanCard({ navigation, onStartQuiz, startingQuiz }) {
  const [plan, setPlan] = useState(null);
  const [failed, setFailed] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get("/tests/today-plan")
        .then((res) => {
          if (!alive) return;
          setPlan(res.data);
          setFailed(false);
        })
        .catch(() => alive && setFailed(true));
      return () => {
        alive = false;
      };
    }, [])
  );

  function go(step) {
    if (step.key === "quiz") return onStartQuiz();
    if (step.key === "practice") {
      if (step.suggestion) {
        return navigation.navigate("PracticeMode", { subject: step.suggestion.subject, chapter: step.suggestion.chapter });
      }
      return navigation.navigate("PracticeTab");
    }
    if (step.key === "mock") {
      if (step.examStage) return navigation.navigate("ExamSeries", { examStage: step.examStage, examName: step.examName });
      return navigation.navigate("MockTab");
    }
  }

  if (!plan) {
    if (failed) return null; // Home still works without the card.
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  const streak = plan.streak?.current || 0;
  const allDone = plan.done === plan.total;

  return (
    <View style={styles.card}>
      {/* TOP: progress and streak */}
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>TODAY'S PLAN</Text>
          <Text style={styles.title}>{allDone ? "All done for today!" : `${plan.done} of ${plan.total} done`}</Text>
        </View>
        <View style={[styles.streak, streak ? styles.streakOn : null]}>
          <Text style={styles.streakFlame}>{streak ? "🔥" : "✨"}</Text>
          <Text style={[styles.streakText, { color: streak ? STREAK : colors.slate }]}>
            {streak ? `${streak} day${streak === 1 ? "" : "s"}` : "Start a streak"}
          </Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.max((plan.done / plan.total) * 100, plan.done ? 8 : 0)}%` }]} />
      </View>

      {plan.streak?.atRiskToday && !allDone && (
        <Text style={styles.risk}>Finish one test today to keep your {streak}-day streak.</Text>
      )}

      {/* STEPS */}
      {plan.steps.map((step, i) => {
        const isNext = plan.next === step.key;
        const busy = step.key === "quiz" && startingQuiz;
        return (
          <View key={step.key} style={[styles.step, isNext && styles.stepNext]}>
            <View style={[styles.stepIcon, step.done ? styles.stepIconDone : isNext ? styles.stepIconNext : null]}>
              {step.done ? (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              ) : (
                <Ionicons name={ICONS[step.key]} size={15} color={isNext ? "#FFFFFF" : colors.brand} />
              )}
            </View>

            <View style={styles.stepBody}>
              <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]}>
                {i + 1}. {step.title}
              </Text>
              {step.key === "quiz" && step.done && step.result ? (
                <TouchableOpacity onPress={() => navigation.navigate("QuizBoard")} hitSlop={6} accessibilityRole="button">
                  <Text style={styles.stepRank}>
                    {step.result.correct} correct
                    {step.result.rank ? ` · Rank ${step.result.rank} of ${step.result.participants}` : ""} · See ranking ›
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.stepSub} numberOfLines={2}>
                  {step.subtitle}
                </Text>
              )}
            </View>

            {!step.done && step.available && (
              <TouchableOpacity
                onPress={() => go(step)}
                disabled={busy}
                activeOpacity={0.85}
                accessibilityRole="button"
                style={[styles.button, isNext ? styles.buttonPrimary : styles.buttonGhost]}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.buttonText, { color: isNext ? "#FFFFFF" : colors.brand }]}>
                    {step.key === "quiz" ? "Start" : step.key === "practice" ? "Practise" : "Open"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      {allDone && (
        <Text style={styles.allDone}>Great work. Come back tomorrow for a new quiz and keep the 🔥 going.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.brandLight,
    padding: spacing.md,
    shadowColor: colors.brand,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  loading: { minHeight: 140, alignItems: "center", justifyContent: "center" },
  top: { flexDirection: "row", alignItems: "center" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, color: colors.brand },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 2 },
  streak: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full, backgroundColor: colors.slateLight },
  streakOn: { backgroundColor: "#FFF1E8" },
  streakFlame: { fontSize: 14 },
  streakText: { fontSize: 12, fontWeight: "800" },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.slateLight, marginTop: 10, marginBottom: 6, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.success },
  risk: { fontSize: 12, fontWeight: "700", color: STREAK, marginBottom: 4 },
  step: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 8, borderRadius: 16, marginTop: 4 },
  stepNext: { backgroundColor: colors.brandTint },
  stepIcon: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.brandTint, borderWidth: 1, borderColor: colors.brandLight },
  stepIconNext: { backgroundColor: colors.brand, borderColor: colors.brand },
  stepIconDone: { backgroundColor: colors.success, borderColor: colors.success },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  stepTitleDone: { color: colors.slate },
  stepSub: { fontSize: 12, color: colors.slate, marginTop: 2 },
  stepRank: { fontSize: 12, fontWeight: "700", color: colors.success, marginTop: 2 },
  button: { minWidth: 82, height: 36, paddingHorizontal: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  buttonPrimary: { backgroundColor: colors.brand },
  buttonGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.brandLight },
  buttonText: { fontSize: 13, fontWeight: "800" },
  allDone: { fontSize: 12, color: colors.slate, textAlign: "center", marginTop: 8 },
});
