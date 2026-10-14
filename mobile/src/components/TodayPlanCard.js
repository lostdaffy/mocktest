import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme/theme";

// Today's task on Home: the Daily GK Quiz.
//
// Everyone gets the same 20 questions, so the day has a rank - the one
// small thing to do every day, and the streak that comes with it. Practice
// and the week's mock have their own places on Home (Quick actions and
// Continue learning), so this card stays one task and compact. Drawn in the
// brand colour, no gradients. Data from GET /tests/today-plan (its quiz step
// and the streak).

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function todayLabel() {
  const d = new Date();
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
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

  if (!plan) {
    if (failed) return null; // Home still works without the card.
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator color="#FFFFFF" />
      </View>
    );
  }

  const quiz = plan.steps?.find((s) => s.key === "quiz");
  if (!quiz) return null;
  const streak = plan.streak?.current || 0;
  const atRisk = plan.streak?.atRiskToday && !quiz.done;

  return (
    <View style={styles.card}>
      {/* soft shapes for depth - flat colour, no gradient */}
      <View style={styles.blobOne} />
      <View style={styles.blobTwo} />

      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>TODAY'S TASK · {todayLabel().toUpperCase()}</Text>
        <View style={styles.streak}>
          <Text style={styles.streakText}>{streak ? `🔥 ${streak} day${streak === 1 ? "" : "s"}` : "🔥 0"}</Text>
        </View>
      </View>

      <View style={styles.mainRow}>
        <View style={styles.icon}>
          <Ionicons name={quiz.done ? "checkmark" : "flash"} size={22} color={colors.brand} />
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            Daily GK Quiz
          </Text>
          {quiz.done && quiz.result ? (
            <Text style={styles.sub} numberOfLines={1}>
              {quiz.result.correct} correct{quiz.result.rank ? ` · Rank ${quiz.result.rank}/${quiz.result.participants}` : ""}
            </Text>
          ) : (
            <Text style={styles.sub} numberOfLines={1}>
              {atRisk ? `Play today to keep your ${streak}-day streak` : quiz.available ? "20 Qs · same for all · ranked" : "Today's quiz is being prepared"}
            </Text>
          )}
        </View>

        {quiz.done ? (
          <TouchableOpacity style={styles.buttonGhost} activeOpacity={0.85} onPress={() => navigation.navigate("QuizBoard")}>
            <Text style={styles.buttonGhostText}>Ranking</Text>
          </TouchableOpacity>
        ) : quiz.available ? (
          <TouchableOpacity style={styles.button} activeOpacity={0.85} disabled={startingQuiz} onPress={onStartQuiz}>
            {startingQuiz ? <ActivityIndicator size="small" color={colors.brand} /> : <Text style={styles.buttonText}>Play</Text>}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.brand,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    overflow: "hidden",
    shadowColor: colors.brand,
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  loading: { minHeight: 104, alignItems: "center", justifyContent: "center" },
  blobOne: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.07)",
    top: -70,
    right: -40,
  },
  blobTwo: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -45,
    right: 70,
  },

  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.7, color: "rgba(255,255,255,0.75)" },
  streak: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.16)" },
  streakText: { fontSize: 11.5, fontWeight: "800", color: "#FFFFFF" },

  mainRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 },
  icon: { width: 44, height: 44, borderRadius: 14, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  sub: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)", marginTop: 2 },

  button: { minWidth: 72, height: 36, paddingHorizontal: 16, borderRadius: 12, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
  buttonText: { fontSize: 14, fontWeight: "800", color: colors.brand },
  buttonGhost: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonGhostText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
});
