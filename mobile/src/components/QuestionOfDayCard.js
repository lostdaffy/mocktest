import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors } from "../theme/theme";

// Question of the Day on Home - ten seconds, every day.
//
// One short question, the same for everyone (GET /tests/question-of-day).
// Tap an option and the card flips over to show whether it was right, the
// right answer and why, and how many students got it - with a burst of
// confetti for a right answer. The first answer is the one that counts.
// Shown in Hindi to a student who reads in Hindi, when the question has it.

const LETTERS = ["A", "B", "C", "D"];
const CONFETTI = ["#4F46E5", "#16A34A", "#F59E0B", "#EC4899", "#06B6D4", "#7C3AED"];

function Confetti({ run }) {
  const pieces = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      v: new Animated.Value(0),
      x: (i % 8) * 40 - 140 + (i > 7 ? 20 : 0),
      color: CONFETTI[i % CONFETTI.length],
      size: 6 + (i % 3) * 2,
    }))
  ).current;

  useEffect(() => {
    if (!run) return;
    pieces.forEach((p) => p.v.setValue(0));
    Animated.stagger(
      25,
      pieces.map((p) => Animated.timing(p.v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }))
    ).start();
  }, [run, pieces]);

  if (!run) return null;
  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: "absolute",
            top: 40,
            left: "50%",
            width: p.size,
            height: p.size,
            borderRadius: i % 2 ? p.size / 2 : 2,
            backgroundColor: p.color,
            opacity: p.v.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateX: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, p.x] }) },
              { translateY: p.v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, -60 - (i % 4) * 12, 120] }) },
              { rotate: p.v.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${(i % 2 ? 1 : -1) * 360}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

export default function QuestionOfDayCard({ user }) {
  const [data, setData] = useState(undefined); // undefined = loading
  const [sending, setSending] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const flip = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const hindi = user?.preferredLanguage === "hi";

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get("/tests/question-of-day")
        .then((res) => alive && setData(res.data || null))
        .catch(() => alive && setData(null));
      return () => {
        alive = false;
      };
    }, [])
  );

  // A gentle pulse on the bulb while the question waits for an answer.
  useEffect(() => {
    if (!data?.question || data.answer) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [data, glow]);

  async function answer(i) {
    if (sending !== null || data?.answer) return;
    setSending(i);
    try {
      const res = await api.post("/tests/question-of-day/answer", { selectedIndex: i });
      // Turn the card over: edge-on at the middle, then the result face.
      Animated.timing(flip, { toValue: 1, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
        setData(res.data);
        if (res.data?.answer?.correct) setCelebrate(true);
        Animated.timing(flip, { toValue: 2, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
          flip.setValue(0);
          setTimeout(() => setCelebrate(false), 1400);
        });
      });
    } catch {
      // nothing to do - the options stay tappable
    } finally {
      setSending(null);
    }
  }

  if (data === undefined) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  }
  if (!data?.question) return null;

  const q = data.question;
  const text = (hindi && q.textHi) || q.text;
  const options = (hindi && q.optionsHi) || q.options;
  const a = data.answer;
  const solution = a ? (hindi && a.solutionHi) || a.solution : null;

  const rotateY = flip.interpolate({ inputRange: [0, 1, 2], outputRange: ["0deg", "90deg", "0deg"] });
  const bulbScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

  return (
    <View>
      <Animated.View style={[styles.card, { transform: [{ perspective: 800 }, { rotateY }] }]}>
        <View style={styles.head}>
          <Animated.View style={[styles.bulb, { transform: [{ scale: a ? 1 : bulbScale }] }]}>
            <Ionicons name="bulb" size={15} color="#F59E0B" />
          </Animated.View>
          <Text style={styles.eyebrow}>QUESTION OF THE DAY</Text>
          <View style={styles.subject}>
            <Text style={styles.subjectText}>{q.subject}</Text>
          </View>
        </View>

        <Text style={styles.question}>{text}</Text>

        <View style={styles.options}>
          {options.map((opt, i) => {
            const isKey = a && i === a.correctIndex;
            const isMine = a && i === a.selectedIndex;
            const wrongPick = isMine && !a.correct;
            return (
              <TouchableOpacity
                key={i}
                activeOpacity={0.8}
                disabled={!!a || sending !== null}
                onPress={() => answer(i)}
                style={[styles.option, isKey && styles.optionRight, wrongPick && styles.optionWrong, a && !isKey && !wrongPick && styles.optionDim]}
              >
                <View style={[styles.letter, isKey && styles.letterRight, wrongPick && styles.letterWrong]}>
                  {sending === i ? (
                    <ActivityIndicator size="small" color={colors.brand} />
                  ) : isKey ? (
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  ) : wrongPick ? (
                    <Ionicons name="close" size={13} color="#FFFFFF" />
                  ) : (
                    <Text style={styles.letterText}>{LETTERS[i]}</Text>
                  )}
                </View>
                <Text style={styles.optionText} numberOfLines={2}>
                  {opt}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {a && (
          <View style={[styles.result, a.correct ? styles.resultRight : styles.resultWrong]}>
            <Text style={[styles.resultTitle, { color: a.correct ? colors.success : colors.danger }]}>
              {a.correct ? "🎉 Correct! Well done." : "Not quite - see the right answer above."}
            </Text>
            {!!solution && (
              <Text style={styles.solution} numberOfLines={3}>
                {solution}
              </Text>
            )}
            {!!data.stats?.answered && (
              <Text style={styles.stats}>
                {data.stats.correctPct}% of {data.stats.answered} student{data.stats.answered === 1 ? "" : "s"} got it right · new question tomorrow
              </Text>
            )}
          </View>
        )}
      </Animated.View>
      <Confetti run={celebrate} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  loading: { minHeight: 90, alignItems: "center", justifyContent: "center" },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  bulb: { width: 26, height: 26, borderRadius: 9, backgroundColor: "#FEF3C7", alignItems: "center", justifyContent: "center" },
  eyebrow: { flex: 1, fontSize: 10.5, fontWeight: "800", letterSpacing: 0.7, color: colors.brand },
  subject: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: colors.brandTint },
  subjectText: { fontSize: 10.5, fontWeight: "800", color: colors.brand },
  question: { fontSize: 15, lineHeight: 21, fontWeight: "800", color: colors.ink, marginTop: 10 },

  options: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  option: {
    width: "48.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSoft,
    minHeight: 42,
  },
  optionRight: { borderColor: colors.successBorder, backgroundColor: colors.successLight },
  optionWrong: { borderColor: colors.dangerBorder, backgroundColor: colors.dangerLight },
  optionDim: { opacity: 0.55 },
  letter: { width: 22, height: 22, borderRadius: 7, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" },
  letterRight: { backgroundColor: colors.success },
  letterWrong: { backgroundColor: colors.danger },
  letterText: { fontSize: 11, fontWeight: "900", color: colors.brand },
  optionText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: colors.ink },

  result: { marginTop: 12, borderRadius: 12, padding: 10 },
  resultRight: { backgroundColor: colors.successLight },
  resultWrong: { backgroundColor: colors.dangerLight },
  resultTitle: { fontSize: 13, fontWeight: "800" },
  solution: { fontSize: 12, lineHeight: 17, color: colors.inkSoft, marginTop: 4 },
  stats: { fontSize: 11, fontWeight: "700", color: colors.slate, marginTop: 6 },

  confettiLayer: { position: "absolute", top: 0, left: 0, right: 0, height: 220, overflow: "visible" },
});
