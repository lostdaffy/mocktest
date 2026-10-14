import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import api from "../api/client";
import { colors } from "../theme/theme";

// "Today's plan" - the first thing on Home.
//
// A student who opens the app should not have to work out what to do. Three
// steps, in order: the Daily GK Quiz (same 20 questions for everyone, so it
// has a rank), one practice test (the chapter they were on, or the first of
// their exam), and the week's mock. The next step carries the one coloured
// button; finished steps are ticked - and the quiz shows where they ranked.
//
// Kept compact on purpose: a slim brand header with the day's progress ring,
// then one row per step, so Quick actions and Continue learning still fit on
// the first screen without scrolling. Flat colours, no gradients.

const STEP_LOOK = {
  quiz: { icon: "flash", fg: "#D97706", bg: "#FFF4DE", label: "Start" },
  practice: { icon: "book", fg: "#16A34A", bg: "#E6F7EC", label: "Practise" },
  mock: { icon: "document-text", fg: colors.brand, bg: colors.brandLight, label: "Open" },
};
const STREAK = "#EA580C";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function headline(done, total) {
  if (done >= total) return "All done for today! 🎉";
  if (done === 0) return "3 steps for today";
  if (total - done === 1) return "Just one step left";
  return `${total - done} steps to go`;
}

function ProgressRing({ done, total }) {
  const size = 46;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const part = total ? done / total : 0;
  return (
    <View style={styles.ring}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} fill="none" />
        {part > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#FFFFFF"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * part} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <Text style={styles.ringValue}>
        {done}/{total}
      </Text>
    </View>
  );
}

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
  const allDone = plan.done >= plan.total;

  return (
    <View style={styles.card}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TODAY'S PLAN · {todayLabel().toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {headline(plan.done, plan.total)}
          </Text>
          <Text style={styles.streakLine} numberOfLines={1}>
            {streak ? `🔥 ${streak}-day streak` : "✨ Finish a test to start a streak"}
          </Text>
        </View>
        <ProgressRing done={plan.done} total={plan.total} />
      </View>

      {plan.streak?.atRiskToday && !allDone && (
        <View style={styles.risk}>
          <Ionicons name="alert-circle" size={14} color={STREAK} />
          <Text style={styles.riskText} numberOfLines={1}>
            Finish one test today to keep your {streak}-day streak
          </Text>
        </View>
      )}

      {/* STEPS */}
      <View style={styles.steps}>
        {plan.steps.map((step, i) => {
          const look = STEP_LOOK[step.key] || STEP_LOOK.mock;
          const isNext = !step.done && plan.next === step.key;
          const busy = step.key === "quiz" && startingQuiz;
          const tappable = !step.done && step.available && !busy;
          return (
            <TouchableOpacity
              key={step.key}
              activeOpacity={tappable ? 0.8 : 1}
              disabled={!tappable}
              onPress={() => go(step)}
              accessibilityRole="button"
              style={[styles.step, isNext && { backgroundColor: look.bg }, i > 0 && !isNext && styles.stepDivider]}
            >
              <View style={[styles.icon, { backgroundColor: step.done ? colors.success : isNext ? look.fg : look.bg }]}>
                <Ionicons name={step.done ? "checkmark" : look.icon} size={16} color={step.done || isNext ? "#FFFFFF" : look.fg} />
              </View>

              <View style={styles.body}>
                <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]} numberOfLines={1}>
                  {step.title}
                </Text>
                {step.key === "quiz" && step.done && step.result ? (
                  <Text style={styles.rank} numberOfLines={1} onPress={() => navigation.navigate("QuizBoard")}>
                    {step.result.correct} correct
                    {step.result.rank ? ` · Rank ${step.result.rank}/${step.result.participants}` : ""} · Ranking ›
                  </Text>
                ) : (
                  <Text style={styles.stepSub} numberOfLines={1}>
                    {step.subtitle}
                  </Text>
                )}
              </View>

              {step.done ? (
                <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              ) : !step.available ? null : isNext ? (
                <View style={[styles.button, { backgroundColor: look.fg }]}>
                  {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>{look.label}</Text>}
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={18} color={colors.slateSoft} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: colors.brand,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  loading: { minHeight: 120, alignItems: "center", justifyContent: "center" },

  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7, color: "rgba(255,255,255,0.72)" },
  title: { fontSize: 17, fontWeight: "800", color: "#FFFFFF", marginTop: 2 },
  streakLine: { fontSize: 11.5, fontWeight: "700", color: "rgba(255,255,255,0.9)", marginTop: 2 },

  ring: { width: 46, height: 46, alignItems: "center", justifyContent: "center" },
  ringValue: { position: "absolute", fontSize: 12.5, fontWeight: "900", color: "#FFFFFF" },

  risk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFF1E8",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  riskText: { flex: 1, fontSize: 11.5, fontWeight: "700", color: STREAK },

  steps: { padding: 6 },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 14,
  },
  stepDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft, borderRadius: 0 },
  icon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  stepTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
  stepTitleDone: { color: colors.slate },
  stepSub: { fontSize: 11.5, color: colors.slate, marginTop: 1 },
  rank: { fontSize: 11.5, fontWeight: "800", color: colors.success, marginTop: 1 },
  button: { minWidth: 76, height: 32, paddingHorizontal: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" },
});
