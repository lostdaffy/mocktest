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
// their exam), and the week's mock. The next step has the one big button;
// finished steps show a tick - and the quiz shows where they ranked.
//
// Drawn in flat colours: a brand-coloured header with the day's progress
// ring and streak, then the steps as a short timeline, each in its own
// colour so the three kinds of work are told apart at a glance.

const STEP_LOOK = {
  quiz: { icon: "flash", fg: "#D97706", bg: "#FFF4DE", border: "#F6D9A3", label: "Start quiz", meta: "20 Qs · ranked" },
  practice: { icon: "book", fg: "#16A34A", bg: "#E6F7EC", border: "#B9E6C9", label: "Practise", meta: "20 Qs" },
  mock: { icon: "document-text", fg: colors.brand, bg: colors.brandLight, border: "#D3CEFF", label: "Open", meta: "Full paper" },
};
const STREAK = "#EA580C";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function headline(done, total) {
  if (done >= total) return "All done for today!";
  if (done === 0) return "Your 3 steps for today";
  if (total - done === 1) return "Just one step left";
  return `${total - done} steps to go`;
}

function ProgressRing({ done, total }) {
  const size = 62;
  const stroke = 6;
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
      <View style={styles.ringCenter}>
        <Text style={styles.ringValue}>
          {done}/{total}
        </Text>
        <Text style={styles.ringLabel}>DONE</Text>
      </View>
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
      {/* HEADER: day, progress ring, streak */}
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TODAY · {todayLabel().toUpperCase()}</Text>
          <Text style={styles.title}>{headline(plan.done, plan.total)}</Text>
          <View style={[styles.streak, streak ? styles.streakOn : null]}>
            <Text style={styles.streakFlame}>{streak ? "🔥" : "✨"}</Text>
            <Text style={[styles.streakText, streak ? { color: STREAK } : null]}>
              {streak ? `${streak}-day streak` : "Finish a test to start a streak"}
            </Text>
          </View>
        </View>
        <ProgressRing done={plan.done} total={plan.total} />
      </View>

      <View style={styles.body}>
        {plan.streak?.atRiskToday && !allDone && (
          <View style={styles.risk}>
            <Ionicons name="alert-circle" size={16} color={STREAK} />
            <Text style={styles.riskText}>Finish one test today to keep your {streak}-day streak.</Text>
          </View>
        )}

        {/* STEPS - a short timeline */}
        {plan.steps.map((step, i) => {
          const look = STEP_LOOK[step.key] || STEP_LOOK.mock;
          const isNext = !step.done && plan.next === step.key;
          const busy = step.key === "quiz" && startingQuiz;
          const last = i === plan.steps.length - 1;
          return (
            <View key={step.key} style={styles.stepRow}>
              {/* rail: number or tick, joined by a line */}
              <View style={styles.rail}>
                <View
                  style={[
                    styles.dot,
                    step.done
                      ? styles.dotDone
                      : isNext
                      ? { backgroundColor: look.fg, borderColor: look.fg }
                      : { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  {step.done ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <Text style={[styles.dotText, isNext && { color: "#FFFFFF" }]}>{i + 1}</Text>
                  )}
                </View>
                {!last && <View style={[styles.line, step.done && styles.lineDone]} />}
              </View>

              <TouchableOpacity
                activeOpacity={step.done || !step.available ? 1 : 0.85}
                disabled={step.done || !step.available || busy}
                onPress={() => go(step)}
                accessibilityRole="button"
                style={[
                  styles.step,
                  isNext && { backgroundColor: look.bg, borderColor: look.border },
                  step.done && styles.stepDone,
                  !last && { marginBottom: 10 },
                ]}
              >
                <View style={styles.stepTop}>
                  <View style={[styles.stepIcon, { backgroundColor: step.done ? colors.slateLight : isNext ? colors.surface : look.bg }]}>
                    <Ionicons name={look.icon} size={17} color={step.done ? colors.slateSoft : look.fg} />
                  </View>

                  <View style={styles.stepBody}>
                    <Text style={[styles.stepTitle, step.done && styles.stepTitleDone]} numberOfLines={2}>
                      {step.title}
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

                  {!step.done && step.available && !isNext && (
                    <View style={styles.smallButton}>
                      <Text style={[styles.smallButtonText, { color: look.fg }]}>{look.label}</Text>
                      <Ionicons name="chevron-forward" size={13} color={look.fg} />
                    </View>
                  )}

                  {step.done && (
                    <View style={styles.donePill}>
                      <Text style={styles.donePillText}>Done</Text>
                    </View>
                  )}
                </View>

                {isNext && step.available && (
                  <View style={styles.stepFoot}>
                    <View style={[styles.meta, { backgroundColor: isNext ? colors.surface : colors.slateLight }]}>
                      <Text style={[styles.metaText, { color: isNext ? look.fg : colors.slate }]}>{look.meta}</Text>
                    </View>
                    <View style={[styles.button, isNext ? { backgroundColor: look.fg } : styles.buttonGhost]}>
                      {busy ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Text style={[styles.buttonText, { color: isNext ? "#FFFFFF" : look.fg }]}>{look.label}</Text>
                          <Ionicons name="arrow-forward" size={14} color={isNext ? "#FFFFFF" : look.fg} />
                        </>
                      )}
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}

        {allDone && (
          <View style={styles.allDone}>
            <Text style={styles.allDoneEmoji}>🎉</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.allDoneTitle}>Great work today!</Text>
              <Text style={styles.allDoneText}>Come back tomorrow for a new quiz and keep the 🔥 going.</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    shadowColor: colors.brand,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  loading: { minHeight: 160, alignItems: "center", justifyContent: "center" },

  /* header */
  header: {
    backgroundColor: colors.brand,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.8, color: "rgba(255,255,255,0.75)" },
  title: { fontSize: 20, lineHeight: 26, fontWeight: "800", color: "#FFFFFF", marginTop: 4 },
  streak: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
  },
  streakOn: { backgroundColor: "#FFFFFF" },
  streakFlame: { fontSize: 13 },
  streakText: { fontSize: 12, fontWeight: "800", color: "#FFFFFF" },

  ring: { width: 62, height: 62, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },
  ringValue: { fontSize: 16, fontWeight: "900", color: "#FFFFFF" },
  ringLabel: { fontSize: 8, fontWeight: "800", letterSpacing: 0.8, color: "rgba(255,255,255,0.75)", marginTop: -1 },

  /* body */
  body: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 14 },
  risk: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF1E8",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginBottom: 12,
  },
  riskText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: STREAK },

  stepRow: { flexDirection: "row", gap: 10 },
  rail: { width: 26, alignItems: "center" },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  dotDone: { backgroundColor: colors.success, borderColor: colors.success },
  dotText: { fontSize: 12, fontWeight: "900", color: colors.slate },
  line: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4, marginBottom: -10, borderRadius: 1 },
  lineDone: { backgroundColor: colors.success },

  step: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 12,
  },
  stepDone: { backgroundColor: colors.surfaceSoft, borderColor: colors.borderSoft },
  stepTop: { flexDirection: "row", alignItems: "center", gap: 11 },
  stepIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  stepBody: { flex: 1, minWidth: 0 },
  stepTitle: { fontSize: 15, lineHeight: 20, fontWeight: "800", color: colors.ink },
  stepTitleDone: { color: colors.slate, textDecorationLine: "line-through" },
  stepSub: { fontSize: 12.5, lineHeight: 17, color: colors.slate, marginTop: 2 },
  stepRank: { fontSize: 12.5, fontWeight: "800", color: colors.success, marginTop: 3 },
  donePill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: colors.successLight },
  donePillText: { fontSize: 11, fontWeight: "800", color: colors.success },

  stepFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  meta: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  metaText: { fontSize: 11, fontWeight: "800" },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 110,
    justifyContent: "center",
  },
  buttonGhost: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  smallButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 10,
    paddingRight: 6,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.slateLight,
  },
  smallButtonText: { fontSize: 12.5, fontWeight: "800" },
  buttonText: { fontSize: 13.5, fontWeight: "800" },

  allDone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    padding: 12,
    borderRadius: 16,
    backgroundColor: colors.successLight,
  },
  allDoneEmoji: { fontSize: 26 },
  allDoneTitle: { fontSize: 14, fontWeight: "800", color: colors.success },
  allDoneText: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2, lineHeight: 17 },
});
