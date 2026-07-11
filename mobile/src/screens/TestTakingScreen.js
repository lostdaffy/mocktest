import { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
} from "react-native";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

export default function TestTakingScreen({ route, navigation }) {
  const { testId } = route.params;
  const { user } = useAuth();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({}); // questionId -> { selectedIndex, timeTakenSeconds, markedForReview }
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState(user?.preferredLanguage || "hi");
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    load();
    // Prevent accidental back-button exit mid-test
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert("Test chhodna hai?", "Aapka progress save nahi hoga.", [
        { text: "Nahi", style: "cancel" },
        { text: "Haan", onPress: () => navigation.goBack() },
      ]);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!test) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/tests/${testId}`);
      setTest(res.data.test);
      setSecondsLeft(res.data.test.durationMinutes * 60);
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        Alert.alert("Premium Feature", err.response.data.message, [
          { text: "Baad mein", style: "cancel", onPress: () => navigation.goBack() },
          { text: "Upgrade Karo", onPress: () => navigation.replace("Subscription") },
        ]);
      } else {
        Alert.alert("Error", "Test load nahi ho paya");
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  }

  function recordTimeSpent(questionId) {
    const spent = Math.round((Date.now() - questionStartRef.current) / 1000);
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        timeTakenSeconds: (prev[questionId]?.timeTakenSeconds || 0) + spent,
      },
    }));
    questionStartRef.current = Date.now();
  }

  function selectOption(questionId, idx) {
    recordTimeSpent(questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedIndex: idx } }));
  }

  function toggleMarkForReview(questionId) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], markedForReview: !prev[questionId]?.markedForReview },
    }));
  }

  function goToQuestion(idx) {
    if (test) recordTimeSpent(test.questions[currentIdx]._id);
    setCurrentIdx(idx);
  }

  const handleSubmit = useCallback(
    async (autoSubmitted = false) => {
      if (submitting || !test) return;
      setSubmitting(true);
      recordTimeSpent(test.questions[currentIdx]._id);

      const payload = {
        answers: test.questions.map((q) => ({
          questionId: q._id,
          selectedIndex: answers[q._id]?.selectedIndex ?? null,
          timeTakenSeconds: answers[q._id]?.timeTakenSeconds || 0,
          markedForReview: answers[q._id]?.markedForReview || false,
        })),
      };

      try {
        const res = await api.post(`/tests/${testId}/submit`, payload);
        navigation.replace("Result", { attemptId: res.data.attemptId });
      } catch (err) {
        Alert.alert("Error", "Submit fail hua, dobara try karo");
        setSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [answers, test, currentIdx, submitting]
  );

  if (loading || !test) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!test.questions || test.questions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={{ fontSize: 15, color: colors.slate, textAlign: "center", paddingHorizontal: 30 }}>
          Is test mein abhi koi question available nahi hai. Baad mein try karo.
        </Text>
        <TouchableOpacity style={{ marginTop: 20 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.brand, fontWeight: "700" }}>Wapas Jao</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const question = test.questions[currentIdx];
  const currentAnswer = answers[question._id];
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  // Fall back to English if a Hindi translation isn't available for this question
  const questionText = language === "hi" && question.textHi ? question.textHi : question.text;
  const questionOptions =
    language === "hi" && question.optionsHi && question.optionsHi.length === 4 ? question.optionsHi : question.options;

  return (
    <View style={styles.container}>
      <View style={styles.timerBar}>
        <Text style={styles.progress}>
          Q{currentIdx + 1} / {test.questions.length}
        </Text>
        <View style={styles.langToggle}>
          <TouchableOpacity
            style={[styles.langOption, language === "hi" && styles.langOptionActive]}
            onPress={() => setLanguage("hi")}
          >
            <Text style={[styles.langOptionText, language === "hi" && styles.langOptionTextActive]}>हिं</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langOption, language === "en" && styles.langOptionActive]}
            onPress={() => setLanguage("en")}
          >
            <Text style={[styles.langOptionText, language === "en" && styles.langOptionTextActive]}>EN</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.timer, secondsLeft < 60 && { color: colors.danger }]}>
          ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>
      </View>

      <ScrollView style={styles.questionArea} contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={styles.questionText}>{questionText}</Text>

        {questionOptions.map((opt, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.option, currentAnswer?.selectedIndex === idx && styles.optionSelected]}
            onPress={() => selectOption(question._id, idx)}
          >
            <Text style={[styles.optionText, currentAnswer?.selectedIndex === idx && styles.optionTextSelected]}>
              {String.fromCharCode(65 + idx)}. {opt}
            </Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.markReview} onPress={() => toggleMarkForReview(question._id)}>
          <Text style={styles.markReviewText}>
            {currentAnswer?.markedForReview ? "★ Marked for Review" : "☆ Mark for Review"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <ScrollView horizontal style={styles.palette} showsHorizontalScrollIndicator={false}>
        {test.questions.map((q, idx) => {
          const ans = answers[q._id];
          let bg = colors.border;
          if (ans?.markedForReview) bg = colors.flag;
          else if (ans?.selectedIndex !== undefined && ans?.selectedIndex !== null) bg = colors.success;
          return (
            <TouchableOpacity
              key={q._id}
              style={[styles.paletteItem, { backgroundColor: bg }, idx === currentIdx && styles.paletteItemActive]}
              onPress={() => goToQuestion(idx)}
            >
              <Text style={styles.paletteText}>{idx + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.navButton}
          disabled={currentIdx === 0}
          onPress={() => goToQuestion(currentIdx - 1)}
        >
          <Text style={[styles.navButtonText, currentIdx === 0 && styles.disabledText]}>← Previous</Text>
        </TouchableOpacity>

        {currentIdx === test.questions.length - 1 ? (
          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => Alert.alert("Submit karein?", "Test submit hone ke baad badal nahi sakte.", [
              { text: "Cancel", style: "cancel" },
              { text: "Submit", onPress: () => handleSubmit(false) },
            ])}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>Submit Test</Text>}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={() => goToQuestion(currentIdx + 1)}>
            <Text style={styles.navButtonText}>Next →</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  timerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  progress: { fontWeight: "700", color: colors.ink },
  langToggle: { flexDirection: "row", backgroundColor: colors.slateLight, borderRadius: radius.full, padding: 3 },
  langOption: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: radius.full },
  langOptionActive: { backgroundColor: colors.brand },
  langOptionText: { fontSize: 12, fontWeight: "700", color: colors.slate },
  langOptionTextActive: { color: "#fff" },
  timer: { fontWeight: "800", color: colors.brand, fontSize: 16 },
  questionArea: { flex: 1 },
  questionText: { fontSize: 16, fontWeight: "600", color: colors.ink, marginBottom: spacing.lg, lineHeight: 22 },
  option: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  optionSelected: { borderColor: colors.brand, backgroundColor: colors.brandLight },
  optionText: { fontSize: 14, color: colors.ink },
  optionTextSelected: { color: colors.brandDark, fontWeight: "600" },
  markReview: { marginTop: spacing.md, alignSelf: "flex-start" },
  markReviewText: { color: colors.flag, fontWeight: "600", fontSize: 13 },
  palette: { maxHeight: 56, borderTopWidth: 1, borderColor: colors.border, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  paletteItem: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  paletteItemActive: { borderWidth: 2, borderColor: colors.ink },
  paletteText: { fontWeight: "700", fontSize: 13, color: "#fff" },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  navButton: { paddingVertical: 12, paddingHorizontal: 20 },
  navButtonText: { color: colors.brand, fontWeight: "700" },
  disabledText: { color: colors.slate },
  submitButton: { backgroundColor: colors.success, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24 },
  submitButtonText: { color: "#fff", fontWeight: "700" },
});