import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, BackHandler, Modal, FlatList } from "react-native";
import AppAlert from "../components/AppAlert";
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
  const [visited, setVisited] = useState(new Set());
  const [bookmarked, setBookmarked] = useState({}); // questionId -> boolean
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [questionElapsed, setQuestionElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [language, setLanguage] = useState(user?.preferredLanguage || "hi");
  const [paletteVisible, setPaletteVisible] = useState(false);
  const [instructionsVisible, setInstructionsVisible] = useState(false);
  const questionStartRef = useRef(Date.now());

  useEffect(() => {
    load();
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      AppAlert.alert("Leave the test?", "Your progress won't be saved.", [
        { text: "Stay", style: "cancel" },
        { text: "Leave", style: "destructive", onPress: () => navigation.goBack() },
      ]);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Overall test countdown
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

  // Live per-question stopwatch (resets every time the question changes)
  useEffect(() => {
    setQuestionElapsed(0);
    const timer = setInterval(() => setQuestionElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [currentIdx]);

  // Mark the current question as "visited" the moment it's shown
  useEffect(() => {
    if (!test) return;
    const qId = test.questions[currentIdx]?._id;
    if (qId) setVisited((prev) => new Set(prev).add(qId));
  }, [currentIdx, test]);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/tests/${testId}`);
      setTest(res.data.test);
      setSecondsLeft(res.data.test.durationMinutes * 60);
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        AppAlert.alert("Premium Feature", err.response.data.message, [
          { text: "Later", style: "cancel", onPress: () => navigation.goBack() },
          { text: "Upgrade", onPress: () => navigation.replace("Subscription") },
        ]);
      } else {
        AppAlert.alert("Something went wrong", "Couldn't load the test");
        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  }

  // Group questions by subject to build section tabs, matching how
  // professional exam apps (Testbook etc.) let students jump between sections.
  const sections = useMemo(() => {
    if (!test) return [];
    const order = [];
    const map = {};
    test.questions.forEach((q, idx) => {
      const subj = q.subject || "General";
      if (!map[subj]) {
        map[subj] = { subject: subj, startIdx: idx, indices: [] };
        order.push(subj);
      }
      map[subj].indices.push(idx);
    });
    return order.map((s) => map[s]);
  }, [test]);

  const currentSection = useMemo(() => {
    if (!test) return null;
    return sections.find((s) => s.indices.includes(currentIdx));
  }, [sections, currentIdx, test]);

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
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedIndex: idx } }));
  }

  function clearResponse(questionId) {
    setAnswers((prev) => ({ ...prev, [questionId]: { ...prev[questionId], selectedIndex: null } }));
  }

  function goToQuestion(idx) {
    if (test) recordTimeSpent(test.questions[currentIdx]._id);
    setCurrentIdx(idx);
    setPaletteVisible(false);
  }

  function saveAndNext() {
    const qId = test.questions[currentIdx]._id;
    recordTimeSpent(qId);
    if (currentIdx < test.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      confirmSubmit();
    }
  }

  function markForReviewAndNext() {
    const qId = test.questions[currentIdx]._id;
    setAnswers((prev) => ({ ...prev, [qId]: { ...prev[qId], markedForReview: true } }));
    recordTimeSpent(qId);
    if (currentIdx < test.questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      confirmSubmit();
    }
  }

  async function toggleBookmark(questionId) {
    try {
      const res = await api.post(`/questions/${questionId}/bookmark`);
      setBookmarked((prev) => ({ ...prev, [questionId]: res.data.bookmarked }));
    } catch (err) {
      // non-critical, fail silently
    }
  }

  function reportQuestion(questionId) {
    AppAlert.alert("What's wrong with this question?", "", [
      { text: "Wrong answer", onPress: () => submitReport(questionId, "wrong_answer") },
      { text: "Unclear question", onPress: () => submitReport(questionId, "unclear_question") },
      { text: "Duplicate options", onPress: () => submitReport(questionId, "duplicate_options") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function submitReport(questionId, reason) {
    try {
      await api.post(`/questions/${questionId}/report`, { reason });
      AppAlert.alert("Thanks", "Report submitted — we'll review it.");
    } catch (err) {
      AppAlert.alert("Something went wrong", "Couldn't submit the report");
    }
  }

  function confirmSubmit() {
    AppAlert.alert("Submit test?", "You won't be able to change your answers after this.", [
      { text: "Cancel", style: "cancel" },
      { text: "Submit", onPress: () => handleSubmit(false) },
    ]);
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
        AppAlert.alert("Submit failed", "Please try again");
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
          This test doesn't have any questions yet. Please check back later.
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
  const qMin = Math.floor(questionElapsed / 60);
  const qSec = questionElapsed % 60;
  const marksPerQ = test.marksPerQuestion ?? 1;
  const negMark = test.negativeMarking ?? 0.25;
  const isLastQuestion = currentIdx === test.questions.length - 1;

  const questionText = language === "hi" && question.textHi ? question.textHi : question.text;
  const questionOptions =
    language === "hi" && question.optionsHi && question.optionsHi.length === 4 ? question.optionsHi : question.options;

  function paletteStatus(q, idx) {
    const ans = answers[q._id];
    if (ans?.markedForReview) return "marked";
    if (ans?.selectedIndex !== undefined && ans?.selectedIndex !== null) return "attempted";
    if (visited.has(q._id)) return "unattempted";
    return "unseen";
  }

  const statusColors = {
    marked: colors.flag,
    attempted: colors.success,
    unattempted: colors.slate,
    unseen: colors.border,
  };

  return (
    <View style={styles.container}>
      {/* Top bar: title, timer, palette toggle */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.testTitle} numberOfLines={1}>
            {test.title}
          </Text>
          <TouchableOpacity onPress={() => setInstructionsVisible(true)}>
            <Text style={styles.viewInstructions}>ⓘ Instructions</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.timer, secondsLeft < 60 && { color: colors.danger }]}>
          ⏱ {minutes}:{seconds.toString().padStart(2, "0")}
        </Text>
        <TouchableOpacity style={styles.paletteButton} onPress={() => setPaletteVisible(true)}>
          <Text style={{ fontSize: 18 }}>☰</Text>
        </TouchableOpacity>
      </View>

      {/* Section tabs */}
      {sections.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs}>
          {sections.map((s) => (
            <TouchableOpacity
              key={s.subject}
              style={[styles.sectionTab, currentSection?.subject === s.subject && styles.sectionTabActive]}
              onPress={() => goToQuestion(s.startIdx)}
            >
              <Text
                style={[
                  styles.sectionTabText,
                  currentSection?.subject === s.subject && styles.sectionTabTextActive,
                ]}
              >
                {s.subject}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Question meta row */}
      <View style={styles.metaRow}>
        <View style={styles.qNumberBadge}>
          <Text style={styles.qNumberText}>{currentIdx + 1}</Text>
        </View>
        <Text style={styles.qTimer}>
          🕐 {qMin}:{qSec.toString().padStart(2, "0")}
        </Text>
        <View style={styles.marksBadgePositive}>
          <Text style={styles.marksBadgeTextPositive}>+{marksPerQ}</Text>
        </View>
        <View style={styles.marksBadgeNegative}>
          <Text style={styles.marksBadgeTextNegative}>-{negMark}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={() => toggleBookmark(question._id)} style={styles.iconButton}>
          <Text style={{ fontSize: 16 }}>{bookmarked[question._id] ? "🔖" : "🏷️"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => reportQuestion(question._id)} style={styles.iconButton}>
          <Text style={{ fontSize: 16 }}>🚩</Text>
        </TouchableOpacity>
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
      </ScrollView>

      {/* Bottom action bar */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearButton} onPress={() => clearResponse(question._id)}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reviewButton} onPress={markForReviewAndNext}>
          <Text style={styles.reviewButtonText}>Mark & Next</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={isLastQuestion ? styles.submitButton : styles.saveButton}
          onPress={isLastQuestion ? confirmSubmit : saveAndNext}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>{isLastQuestion ? "Submit Test" : "Save & Next"}</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Question palette modal */}
      <Modal visible={paletteVisible} animationType="slide" onRequestClose={() => setPaletteVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Questions</Text>
            <TouchableOpacity onPress={() => setPaletteVisible(false)}>
              <Text style={{ fontSize: 20 }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legendRow}>
            <LegendItem color={colors.success} label="Attempted" />
            <LegendItem color={colors.flag} label="Marked" />
            <LegendItem color={colors.slate} label="Unattempted" />
            <LegendItem color={colors.border} label="Unseen" outline />
          </View>

          <FlatList
            data={sections}
            keyExtractor={(s) => s.subject}
            contentContainerStyle={{ padding: spacing.lg }}
            renderItem={({ item: section }) => {
              const counts = { marked: 0, attempted: 0, unattempted: 0, unseen: 0 };
              section.indices.forEach((idx) => {
                counts[paletteStatus(test.questions[idx], idx)]++;
              });
              return (
                <View style={{ marginBottom: spacing.lg }}>
                  <Text style={styles.sectionHeading}>{section.subject}</Text>
                  <Text style={styles.sectionCounts}>
                    ✓ {counts.attempted}   ★ {counts.marked}   ○ {counts.unattempted}   ⚪ {counts.unseen}
                  </Text>
                  <View style={styles.grid}>
                    {section.indices.map((idx) => {
                      const status = paletteStatus(test.questions[idx], idx);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={[
                            styles.gridItem,
                            { backgroundColor: status === "unseen" ? "#fff" : statusColors[status] },
                            status === "unseen" && { borderWidth: 1.5, borderColor: colors.border },
                            idx === currentIdx && styles.gridItemActive,
                          ]}
                          onPress={() => goToQuestion(idx)}
                        >
                          <Text style={[styles.gridItemText, status === "unseen" && { color: colors.ink }]}>
                            {idx + 1}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            }}
          />

          <TouchableOpacity
            style={styles.modalSubmitButton}
            onPress={() => {
              setPaletteVisible(false);
              confirmSubmit();
            }}
          >
            <Text style={styles.saveButtonText}>Submit Test</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Instructions modal */}
      <Modal visible={instructionsVisible} animationType="fade" transparent onRequestClose={() => setInstructionsVisible(false)}>
        <View style={styles.instructionsOverlay}>
          <View style={styles.instructionsBox}>
            <Text style={styles.modalTitle}>Instructions</Text>
            <Text style={styles.instructionText}>• Each correct answer earns +{marksPerQ} marks</Text>
            <Text style={styles.instructionText}>• Each wrong answer costs -{negMark} marks</Text>
            <Text style={styles.instructionText}>• "Mark & Next" flags a question for review — it keeps your answer</Text>
            <Text style={styles.instructionText}>• "Clear" removes your current answer</Text>
            <Text style={styles.instructionText}>• The test submits automatically when time runs out</Text>
            <TouchableOpacity style={styles.closeInstructions} onPress={() => setInstructionsVisible(false)}>
              <Text style={styles.saveButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function LegendItem({ color, label, outline }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: outline ? "#fff" : color, borderColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  testTitle: { fontWeight: "700", color: colors.ink, fontSize: 14 },
  viewInstructions: { fontSize: 11, color: colors.brand, marginTop: 2 },
  timer: { fontWeight: "800", color: colors.brand, fontSize: 15 },
  paletteButton: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTabs: { maxHeight: 44, borderBottomWidth: 1, borderColor: colors.border },
  sectionTab: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, justifyContent: "center" },
  sectionTabActive: { borderBottomWidth: 2, borderColor: colors.brand },
  sectionTabText: { fontSize: 13, color: colors.slate, fontWeight: "600" },
  sectionTabTextActive: { color: colors.brand },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  qNumberBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  qNumberText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  qTimer: { fontSize: 12, color: colors.slate },
  marksBadgePositive: { backgroundColor: colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  marksBadgeTextPositive: { color: colors.success, fontWeight: "700", fontSize: 11 },
  marksBadgeNegative: { backgroundColor: colors.dangerLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  marksBadgeTextNegative: { color: colors.danger, fontWeight: "700", fontSize: 11 },
  iconButton: { padding: 4 },
  langToggle: { flexDirection: "row", backgroundColor: colors.slateLight, borderRadius: radius.full, padding: 3 },
  langOption: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  langOptionActive: { backgroundColor: colors.brand },
  langOptionText: { fontSize: 11, fontWeight: "700", color: colors.slate },
  langOptionTextActive: { color: "#fff" },
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
  footer: {
    flexDirection: "row",
    padding: spacing.md,
    gap: 8,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  clearButtonText: { color: colors.slate, fontWeight: "700", fontSize: 13 },
  reviewButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.flagLight,
    alignItems: "center",
  },
  reviewButtonText: { color: "#92400E", fontWeight: "700", fontSize: 13 },
  saveButton: { flex: 1.3, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center" },
  submitButton: { flex: 1.3, paddingVertical: 12, borderRadius: radius.md, backgroundColor: colors.success, alignItems: "center" },
  saveButtonText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  modalContainer: { flex: 1, backgroundColor: "#fff", paddingTop: 50 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5 },
  legendText: { fontSize: 11, color: colors.slate },
  sectionHeading: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  sectionCounts: { fontSize: 11, color: colors.slate, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: { width: 38, height: 38, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  gridItemActive: { borderWidth: 2, borderColor: colors.ink },
  gridItemText: { fontWeight: "700", fontSize: 13, color: "#fff" },
  modalSubmitButton: {
    margin: spacing.lg,
    backgroundColor: colors.success,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  instructionsOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  instructionsBox: { backgroundColor: "#fff", borderRadius: radius.lg, padding: spacing.lg, width: "85%" },
  instructionText: { fontSize: 13, color: colors.ink, marginTop: spacing.sm, lineHeight: 18 },
  closeInstructions: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: "center",
  },
});