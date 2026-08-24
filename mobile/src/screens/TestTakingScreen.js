import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  Modal,
  FlatList,
  AppState,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import AppAlert from "../components/AppAlert";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";

import {
  colors,
  spacing,
  radius,
  shadow,
} from "../theme/theme";

/* =========================================================
   HELPERS
========================================================= */

function formatClock(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatQuestionTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds || 0);

  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/* =========================================================
   SCREEN
========================================================= */

export default function TestTakingScreen({
  route,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const { testId } = route.params || {};
  const { user } = useAuth();

  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const [currentIdx, setCurrentIdx] = useState(0);

  /*
    questionId -> {
      selectedIndex,
      timeTakenSeconds,
      markedForReview
    }
  */
  const [answers, setAnswers] = useState({});

  const [visited, setVisited] =
    useState(new Set());

  const [bookmarked, setBookmarked] =
    useState({});

  const [secondsLeft, setSecondsLeft] =
    useState(0);

  const [questionElapsed, setQuestionElapsed] =
    useState(0);

  const [submitting, setSubmitting] =
    useState(false);

  const [language, setLanguage] =
    useState(
      user?.preferredLanguage || "hi"
    );

  const [paletteVisible, setPaletteVisible] =
    useState(false);

  const [instructionsVisible, setInstructionsVisible] =
    useState(false);

  const questionStartRef =
    useRef(Date.now());

  const submittingRef =
    useRef(false);

  /*
    Live exam only: the shared wall-clock
    deadline (from the server) and the
    offset between server time and this
    device's clock, so the countdown can be
    recomputed from absolute time on every
    tick instead of drifting while the app
    is backgrounded.
  */
  const liveEndsAtMsRef =
    useRef(null);

  const serverTimeOffsetMsRef =
    useRef(0);

  /*
    Live exam integrity signal: how many
    times, and for how long, the student
    left the app mid-attempt.
  */
  const backgroundCountRef =
    useRef(0);

  const backgroundSecondsRef =
    useRef(0);

  const backgroundedAtRef =
    useRef(null);

  const hasWarnedBackgroundRef =
    useRef(false);

  // Declared early (not just above the submit handler) since the live-exam
  // autosave effect below also needs it, and effects run top-to-bottom in
  // source order within the same component.
  const buildAnswersPayload =
    useCallback(() => {
      if (!test?.questions)
        return [];

      return test.questions.map(
        (question) => ({
          questionId:
            question._id,
          selectedIndex:
            answers[question._id]
              ?.selectedIndex ??
            null,
          timeTakenSeconds:
            answers[question._id]
              ?.timeTakenSeconds ||
            0,
          markedForReview:
            answers[question._id]
              ?.markedForReview ||
            false,
        })
      );
    }, [test, answers]);

  /* =======================================================
     LOAD TEST
  ======================================================= */

  const load = useCallback(async () => {
    if (!testId) return;

    setLoading(true);

    try {
      const res = await api.get(
        `/tests/${testId}`
      );

      const loadedTest =
        res.data?.test;

      setTest(loadedTest);

      /*
        Normal test duration.

        If this is a live exam, the server can provide
        the remaining shared-clock seconds.
      */
      const liveRemaining =
        res.data?.live
          ?.secondsRemaining;

      const durationSeconds =
        Math.max(
          0,
          Math.round(
            (loadedTest?.durationMinutes ||
              0) * 60
          )
        );

      const initialSeconds =
        typeof liveRemaining === "number"
          ? Math.min(
              durationSeconds ||
                liveRemaining,
              liveRemaining
            )
          : durationSeconds;

      setSecondsLeft(
        initialSeconds
      );

      /*
        Store the shared deadline as an
        absolute timestamp (not a countdown)
        so the timer can self-correct after
        the app is backgrounded instead of
        just resuming a stale decrement.
      */
      if (
        loadedTest?.type === "live" &&
        res.data?.live?.endsAt
      ) {
        liveEndsAtMsRef.current = new Date(
          res.data.live.endsAt
        ).getTime();

        serverTimeOffsetMsRef.current =
          res.data.live.serverTime
            ? new Date(
                res.data.live.serverTime
              ).getTime() - Date.now()
            : 0;
      } else {
        liveEndsAtMsRef.current = null;
      }

      questionStartRef.current =
        Date.now();
    } catch (err) {
      const code =
        err.response?.data?.code;

      const message =
        err.response?.data?.message;

      if (
        code ===
        "SUBSCRIPTION_REQUIRED"
      ) {
        AppAlert.alert(
          "Premium Feature",
          message ||
            "Upgrade to access this test.",
          [
            {
              text: "Later",
              style: "cancel",
              onPress: () =>
                navigation.goBack(),
            },
            {
              text: "Upgrade",
              onPress: () =>
                navigation.replace(
                  "Subscription"
                ),
            },
          ]
        );
      } else {
        AppAlert.alert(
          "Something went wrong",
          message ||
            "Couldn't load the test"
        );

        navigation.goBack();
      }
    } finally {
      setLoading(false);
    }
  }, [
    navigation,
    testId,
  ]);

  /* =======================================================
     INITIAL LOAD + BACK HANDLER
  ======================================================= */

  useEffect(() => {
    load();

    const sub =
      BackHandler.addEventListener(
        "hardwareBackPress",
        () => {
          if (submittingRef.current) {
            return true;
          }

          AppAlert.alert(
            "Leave the test?",
            "Your progress won't be saved.",
            [
              {
                text: "Stay",
                style: "cancel",
              },
              {
                text: "Leave",
                style: "destructive",
                onPress: () =>
                  navigation.goBack(),
              },
            ]
          );

          return true;
        }
      );

    return () => sub.remove();
  }, [load, navigation]);

  /* =======================================================
     COUNTDOWN
  ======================================================= */

  const handleSubmitRef =
    useRef(null);

  useEffect(() => {
    if (!test) return;

    // Live exams run on the shared server deadline, recomputed fresh from
    // absolute time every tick - immune to setInterval being throttled
    // while the app is backgrounded, unlike a plain decrement. Non-live
    // tests have no shared deadline to sync against, so they keep the
    // simple per-second countdown.
    const isLiveSynced =
      test.type === "live" &&
      !!liveEndsAtMsRef.current;

    const timer =
      setInterval(() => {
        if (isLiveSynced) {
          const remaining = Math.max(
            0,
            Math.floor(
              (liveEndsAtMsRef.current -
                (Date.now() +
                  serverTimeOffsetMsRef.current)) /
                1000
            )
          );

          setSecondsLeft(remaining);

          if (remaining <= 0) {
            clearInterval(timer);

            if (
              handleSubmitRef.current
            ) {
              handleSubmitRef.current(
                true
              );
            }
          }

          return;
        }

        setSecondsLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);

            if (
              handleSubmitRef.current
            ) {
              handleSubmitRef.current(
                true
              );
            }

            return 0;
          }

          return prev - 1;
        });
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [test]);

  /* =======================================================
     LIVE EXAM INTEGRITY (app-background tracking)
  ======================================================= */

  useEffect(() => {
    if (!test || test.type !== "live")
      return;

    const sub = AppState.addEventListener(
      "change",
      (nextState) => {
        if (
          nextState === "background" ||
          nextState === "inactive"
        ) {
          backgroundedAtRef.current =
            Date.now();
          return;
        }

        if (
          nextState === "active" &&
          backgroundedAtRef.current
        ) {
          const awaySeconds = Math.round(
            (Date.now() -
              backgroundedAtRef.current) /
              1000
          );

          backgroundedAtRef.current = null;

          // Ignore trivial OS-level flicker (e.g. the notification shade)
          // so a real violation is what actually gets counted and shown.
          if (awaySeconds > 2) {
            backgroundCountRef.current += 1;
            backgroundSecondsRef.current +=
              awaySeconds;

            if (
              !hasWarnedBackgroundRef.current
            ) {
              hasWarnedBackgroundRef.current = true;

              AppAlert.alert(
                "Live exam ke dauran app se bahar mat jao",
                "Baar baar app se bahar jaana is attempt ko review ke liye flag kar sakta hai.",
                [{ text: "Theek hai" }]
              );
            }
          }

          // Recompute the timer immediately from the absolute deadline -
          // don't wait for the next 1s tick, which may itself have been
          // delayed by the same backgrounding.
          if (
            liveEndsAtMsRef.current &&
            handleSubmitRef.current
          ) {
            const remaining = Math.max(
              0,
              Math.floor(
                (liveEndsAtMsRef.current -
                  (Date.now() +
                    serverTimeOffsetMsRef.current)) /
                  1000
              )
            );

            setSecondsLeft(remaining);

            if (remaining <= 0) {
              handleSubmitRef.current(
                true
              );
            }
          }
        }
      }
    );

    return () => sub.remove();
  }, [test]);

  /* =======================================================
     LIVE EXAM AUTOSAVE
  ======================================================= */

  useEffect(() => {
    if (!test || test.type !== "live")
      return;

    const timer = setInterval(() => {
      if (submittingRef.current) return;

      api
        .patch(
          `/tests/${testId}/progress`,
          {
            answers:
              buildAnswersPayload(),
            integrityFlags: {
              backgroundCount:
                backgroundCountRef.current,
              backgroundSeconds:
                backgroundSecondsRef.current,
            },
          }
        )
        .catch(() => {
          // Autosave failing silently beats interrupting the student mid-exam.
        });
    }, 20000);

    return () =>
      clearInterval(timer);
  }, [test, testId, buildAnswersPayload]);

  /* =======================================================
     QUESTION STOPWATCH
  ======================================================= */

  useEffect(() => {
    if (!test) return;

    setQuestionElapsed(0);

    questionStartRef.current =
      Date.now();

    const timer =
      setInterval(() => {
        setQuestionElapsed(
          (value) => value + 1
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [currentIdx, test]);

  /* =======================================================
     MARK VISITED
  ======================================================= */

  useEffect(() => {
    if (!test?.questions?.length)
      return;

    const qId =
      test.questions[
        currentIdx
      ]?._id;

    if (!qId) return;

    setVisited((prev) => {
      const next = new Set(prev);
      next.add(qId);
      return next;
    });
  }, [currentIdx, test]);

  /* =======================================================
     SECTIONS
  ======================================================= */

  const sections = useMemo(() => {
    if (!test?.questions) return [];

    const order = [];
    const map = {};

    test.questions.forEach(
      (question, index) => {
        const subject =
          question.subject ||
          "General";

        if (!map[subject]) {
          map[subject] = {
            subject,
            startIdx: index,
            indices: [],
          };

          order.push(subject);
        }

        map[subject].indices.push(
          index
        );
      }
    );

    return order.map(
      (subject) => map[subject]
    );
  }, [test]);

  const currentSection =
    useMemo(() => {
      if (!test) return null;

      return sections.find((section) =>
        section.indices.includes(
          currentIdx
        )
      );
    }, [
      sections,
      currentIdx,
      test,
    ]);

  /* =======================================================
     TIME TRACKING
  ======================================================= */

  const recordTimeSpent = useCallback(
    (questionId) => {
      if (!questionId) return;

      const spent = Math.max(
        0,
        Math.round(
          (Date.now() -
            questionStartRef.current) /
            1000
        )
      );

      if (spent <= 0) return;

      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          timeTakenSeconds:
            (prev[questionId]
              ?.timeTakenSeconds ||
              0) + spent,
        },
      }));

      questionStartRef.current =
        Date.now();
    },
    []
  );

  /* =======================================================
     ANSWERS
  ======================================================= */

  const selectOption = useCallback(
    (questionId, index) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selectedIndex: index,
        },
      }));
    },
    []
  );

  const clearResponse = useCallback(
    (questionId) => {
      setAnswers((prev) => ({
        ...prev,
        [questionId]: {
          ...prev[questionId],
          selectedIndex: null,
        },
      }));
    },
    []
  );

  /* =======================================================
     NAVIGATION
  ======================================================= */

  const goToQuestion = useCallback(
    (index) => {
      if (!test?.questions?.length)
        return;

      const currentQuestion =
        test.questions[currentIdx];

      if (currentQuestion) {
        recordTimeSpent(
          currentQuestion._id
        );
      }

      setCurrentIdx(index);
      setPaletteVisible(false);
    },
    [
      currentIdx,
      recordTimeSpent,
      test,
    ]
  );

  const saveAndNext = useCallback(() => {
    if (!test) return;

    const question =
      test.questions[currentIdx];

    recordTimeSpent(
      question._id
    );

    if (
      currentIdx <
      test.questions.length - 1
    ) {
      setCurrentIdx(
        currentIdx + 1
      );
    } else {
      confirmSubmit();
    }
  }, [
    currentIdx,
    recordTimeSpent,
    test,
  ]);

  const markForReviewAndNext =
    useCallback(() => {
      if (!test) return;

      const question =
        test.questions[currentIdx];

      const qId = question._id;

      setAnswers((prev) => ({
        ...prev,
        [qId]: {
          ...prev[qId],
          markedForReview: true,
        },
      }));

      recordTimeSpent(qId);

      if (
        currentIdx <
        test.questions.length - 1
      ) {
        setCurrentIdx(
          currentIdx + 1
        );
      } else {
        confirmSubmit();
      }
    }, [
      currentIdx,
      recordTimeSpent,
      test,
    ]);

  /* =======================================================
     BOOKMARK
  ======================================================= */

  async function toggleBookmark(
    questionId
  ) {
    try {
      const res =
        await api.post(
          `/questions/${questionId}/bookmark`
        );

      setBookmarked((prev) => ({
        ...prev,
        [questionId]:
          res.data.bookmarked,
      }));
    } catch (err) {
      // non-critical
    }
  }

  /* =======================================================
     REPORT
  ======================================================= */

  function reportQuestion(
    questionId
  ) {
    AppAlert.alert(
      "Report question",
      "What's wrong with this question?",
      [
        {
          text: "Wrong answer",
          onPress: () =>
            submitReport(
              questionId,
              "wrong_answer"
            ),
        },
        {
          text: "Unclear question",
          onPress: () =>
            submitReport(
              questionId,
              "unclear_question"
            ),
        },
        {
          text: "Duplicate options",
          onPress: () =>
            submitReport(
              questionId,
              "duplicate_options"
            ),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  }

  async function submitReport(
    questionId,
    reason
  ) {
    try {
      await api.post(
        `/questions/${questionId}/report`,
        { reason }
      );

      AppAlert.alert(
        "Thanks",
        "Report submitted — we'll review it."
      );
    } catch (err) {
      AppAlert.alert(
        "Something went wrong",
        "Couldn't submit the report"
      );
    }
  }

  /* =======================================================
     SUBMIT
  ======================================================= */

  function confirmSubmit() {
    if (submittingRef.current)
      return;

    const attempted =
      Object.values(answers).filter(
        (answer) =>
          answer?.selectedIndex !==
            undefined &&
          answer?.selectedIndex !==
            null
      ).length;

    AppAlert.alert(
      "Submit test?",
      `${attempted} question${
        attempted === 1 ? "" : "s"
      } attempted. You won't be able to change your answers after submission.`,
      [
        {
          text: "Continue Test",
          style: "cancel",
        },
        {
          text: "Submit",
          onPress: () =>
            handleSubmit(false),
        },
      ]
    );
  }

  const handleSubmit =
    useCallback(
      async (autoSubmitted = false) => {
        if (
          submittingRef.current ||
          !test
        ) {
          return;
        }

        submittingRef.current =
          true;

        setSubmitting(true);

        const currentQuestion =
          test.questions[currentIdx];

        if (currentQuestion) {
          recordTimeSpent(
            currentQuestion._id
          );
        }

        /*
          Small delay allows the latest time
          state update to settle before building
          the payload.
        */
        await new Promise((resolve) =>
          setTimeout(resolve, 0)
        );

        try {
          const payload = {
            answers:
              buildAnswersPayload(),
            language,
            integrityFlags: {
              backgroundCount:
                backgroundCountRef.current,
              backgroundSeconds:
                backgroundSecondsRef.current,
            },
          };

          const res =
            await api.post(
              `/tests/${testId}/submit`,
              payload
            );

          navigation.replace(
            "Result",
            {
              attemptId:
                res.data.attemptId,
            }
          );
        } catch (err) {
          submittingRef.current =
            false;

          setSubmitting(false);

          AppAlert.alert(
            autoSubmitted
              ? "Auto-submit failed"
              : "Submit failed",
            err.response?.data
              ?.message ||
              "Please try again"
          );
        }
      },
      [
        buildAnswersPayload,
        currentIdx,
        language,
        navigation,
        recordTimeSpent,
        test,
        testId,
      ]
    );

  useEffect(() => {
    handleSubmitRef.current =
      handleSubmit;
  }, [handleSubmit]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading || !test) {
    return (
      <View style={styles.loadingScreen}>
        <View
          style={styles.loadingIcon}
        >
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>

        <Text
          style={styles.loadingTitle}
        >
          Preparing your test
        </Text>

        <Text
          style={styles.loadingText}
        >
          Please wait a moment...
        </Text>
      </View>
    );
  }

  /* =======================================================
     EMPTY TEST
  ======================================================= */

  if (
    !test.questions ||
    test.questions.length === 0
  ) {
    return (
      <View
        style={styles.emptyScreen}
      >
        <View
          style={styles.emptyIcon}
        >
          <Ionicons
            name="document-text-outline"
            size={28}
            color={colors.brand}
          />
        </View>

        <Text
          style={styles.emptyTitle}
        >
          No questions available
        </Text>

        <Text
          style={styles.emptyText}
        >
          This test doesn't have any
          questions yet. Please check back
          later.
        </Text>

        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Text
            style={styles.backButtonText}
          >
            Go Back
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /* =======================================================
     CURRENT QUESTION
  ======================================================= */

  const question =
    test.questions[currentIdx];

  const currentAnswer =
    answers[question._id];

  const minutes = Math.floor(
    secondsLeft / 60
  );

  const seconds =
    secondsLeft % 60;

  const marksPerQ =
    test.marksPerQuestion ?? 1;

  const negMark =
    test.negativeMarking ?? 0.25;

  const isLastQuestion =
    currentIdx ===
    test.questions.length - 1;

  const questionText =
    language === "hi" &&
    question.textHi
      ? question.textHi
      : question.text;

  const questionOptions =
    language === "hi" &&
    question.optionsHi &&
    question.optionsHi.length ===
      question.options.length
      ? question.optionsHi
      : question.options || [];

  const progressPercent =
    ((currentIdx + 1) /
      test.questions.length) *
    100;

  /* =======================================================
     PALETTE STATUS
  ======================================================= */

  function paletteStatus(q) {
    const answer =
      answers[q._id];

    if (answer?.markedForReview) {
      return "marked";
    }

    if (
      answer?.selectedIndex !==
        undefined &&
      answer?.selectedIndex !== null
    ) {
      return "attempted";
    }

    if (visited.has(q._id)) {
      return "unattempted";
    }

    return "unseen";
  }

  const statusColors = {
    marked: colors.flag,
    attempted: colors.success,
    unattempted: colors.slate,
    unseen: colors.border,
  };

  const attemptedCount =
    test.questions.filter(
      (q) => {
        const answer =
          answers[q._id];

        return (
          answer?.selectedIndex !==
            undefined &&
          answer?.selectedIndex !==
            null
        );
      }
    ).length;

  const markedCount =
    test.questions.filter(
      (q) =>
        answers[q._id]
          ?.markedForReview
    ).length;

  const answeredCurrent =
    currentAnswer?.selectedIndex !==
      undefined &&
    currentAnswer?.selectedIndex !==
      null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      {/* ===================================================
          TOP HEADER
      =================================================== */}

      <View
        style={[
          styles.topBar,
          {
            paddingTop:
              insets.top + 8,
          },
        ]}
      >
        <View
          style={styles.topLeft}
        >
          <View
            style={styles.testIcon}
          >
            <Ionicons
              name="document-text"
              size={17}
              color={colors.brand}
            />
          </View>

          <View
            style={styles.titleWrap}
          >
            <Text
              style={styles.testTitle}
              numberOfLines={1}
            >
              {test.title}
            </Text>

            <TouchableOpacity
              onPress={() =>
                setInstructionsVisible(
                  true
                )
              }
            >
              <Text
                style={
                  styles.instructionsLink
                }
              >
                View instructions
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.timerBox,
            (secondsLeft <= 60 ||
              test?.type === "live") &&
              styles.timerBoxDanger,
          ]}
        >
          <Ionicons
            name={
              test?.type === "live"
                ? "radio-button-on"
                : "time-outline"
            }
            size={15}
            color={
              secondsLeft <= 60 ||
              test?.type === "live"
                ? colors.danger
                : colors.brand
            }
          />

          <Text
            style={[
              styles.timerText,
              (secondsLeft <= 60 ||
                test?.type === "live") &&
                styles.timerTextDanger,
            ]}
          >
            {formatClock(
              secondsLeft
            )}
          </Text>
        </View>

        <TouchableOpacity
          style={
            styles.paletteButton
          }
          activeOpacity={0.75}
          onPress={() =>
            setPaletteVisible(
              true
            )
          }
        >
          <Ionicons
            name="grid-outline"
            size={18}
            color={colors.ink}
          />
        </TouchableOpacity>
      </View>

      {/* ===================================================
          PROGRESS LINE
      =================================================== */}

      <View
        style={styles.progressTrack}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
            },
          ]}
        />
      </View>

      {/* ===================================================
          SECTION TABS
      =================================================== */}

      {sections.length > 1 && (
        <View
          style={styles.sectionTabsWrap}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.sectionTabsContent
            }
          >
            {sections.map(
              (section) => {
                const active =
                  currentSection?.subject ===
                  section.subject;

                const attempted =
                  section.indices.filter(
                    (index) => {
                      const answer =
                        answers[
                          test.questions[
                            index
                          ]._id
                        ];

                      return (
                        answer?.selectedIndex !==
                          undefined &&
                        answer?.selectedIndex !==
                          null
                      );
                    }
                  ).length;

                return (
                  <TouchableOpacity
                    key={
                      section.subject
                    }
                    style={[
                      styles.sectionTab,
                      active &&
                        styles.sectionTabActive,
                    ]}
                    activeOpacity={0.75}
                    onPress={() =>
                      goToQuestion(
                        section.startIdx
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.sectionTabText,
                        active &&
                          styles.sectionTabTextActive,
                      ]}
                      numberOfLines={
                        1
                      }
                    >
                      {
                        section.subject
                      }
                    </Text>

                    <View
                      style={[
                        styles.sectionCount,
                        active &&
                          styles.sectionCountActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.sectionCountText,
                          active &&
                            styles.sectionCountTextActive,
                        ]}
                      >
                        {
                          attempted
                        }
                        /
                        {
                          section.indices
                            .length
                        }
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }
            )}
          </ScrollView>
        </View>
      )}

      {/* ===================================================
          QUESTION META
      =================================================== */}

      <View
        style={styles.questionMeta}
      >
        <View
          style={styles.questionNumber}
        >
          <Text
            style={
              styles.questionNumberText
            }
          >
            {currentIdx + 1}
          </Text>
        </View>

        <View
          style={styles.questionMetaText}
        >
          <Text
            style={
              styles.questionLabel
            }
          >
            QUESTION
          </Text>

          <Text
            style={
              styles.questionPosition
            }
          >
            {currentIdx + 1} of{" "}
            {test.questions.length}
          </Text>
        </View>

        <View
          style={styles.questionTime}
        >
          <Ionicons
            name="stopwatch-outline"
            size={13}
            color={colors.slate}
          />

          <Text
            style={styles.questionTimeText}
          >
            {formatQuestionTime(
              questionElapsed
            )}
          </Text>
        </View>

        <View
          style={styles.marksGroup}
        >
          <View
            style={
              styles.positiveBadge
            }
          >
            <Text
              style={
                styles.positiveText
              }
            >
              +{marksPerQ}
            </Text>
          </View>

          <View
            style={
              styles.negativeBadge
            }
          >
            <Text
              style={
                styles.negativeText
              }
            >
              −{negMark}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.metaIconButton,
            bookmarked[
              question._id
            ] &&
              styles.metaIconButtonActive,
          ]}
          activeOpacity={0.75}
          onPress={() =>
            toggleBookmark(
              question._id
            )
          }
        >
          <Ionicons
            name={
              bookmarked[
                question._id
              ]
                ? "bookmark"
                : "bookmark-outline"
            }
            size={16}
            color={
              bookmarked[
                question._id
              ]
                ? colors.brand
                : colors.slate
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.metaIconButton
          }
          activeOpacity={0.75}
          onPress={() =>
            reportQuestion(
              question._id
            )
          }
        >
          <Ionicons
            name="flag-outline"
            size={16}
            color={colors.slate}
          />
        </TouchableOpacity>

        <View
          style={styles.languageToggle}
        >
          <TouchableOpacity
            style={[
              styles.languageOption,
              language === "hi" &&
                styles.languageActive,
            ]}
            onPress={() =>
              setLanguage("hi")
            }
          >
            <Text
              style={[
                styles.languageText,
                language === "hi" &&
                  styles.languageTextActive,
              ]}
            >
              हिं
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.languageOption,
              language === "en" &&
                styles.languageActive,
            ]}
            onPress={() =>
              setLanguage("en")
            }
          >
            <Text
              style={[
                styles.languageText,
                language === "en" &&
                  styles.languageTextActive,
              ]}
            >
              EN
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ===================================================
          QUESTION AREA
      =================================================== */}

      <ScrollView
        style={
          styles.questionArea
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={
          styles.questionContent
        }
      >
        <View
          style={styles.questionHeader}
        >
          <View
            style={
              styles.subjectPill
            }
          >
            <Ionicons
              name="layers-outline"
              size={11}
              color={colors.brand}
            />

            <Text
              style={
                styles.subjectPillText
              }
              numberOfLines={1}
            >
              {question.subject ||
                "General"}
            </Text>
          </View>

          {answeredCurrent && (
            <View
              style={
                styles.answeredPill
              }
            >
              <Ionicons
                name="checkmark-circle"
                size={11}
                color={colors.success}
              />

              <Text
                style={
                  styles.answeredPillText
                }
              >
                Answered
              </Text>
            </View>
          )}

          {currentAnswer?.markedForReview && (
            <View
              style={
                styles.reviewPill
              }
            >
              <Ionicons
                name="flag"
                size={10}
                color={colors.flag}
              />

              <Text
                style={
                  styles.reviewPillText
                }
              >
                Review
              </Text>
            </View>
          )}
        </View>

        <Text
          style={
            styles.questionText
          }
        >
          {questionText}
        </Text>

        <View
          style={styles.optionsHeader}
        >
          <Text
            style={
              styles.optionsLabel
            }
          >
            SELECT ONE OPTION
          </Text>

          <Text
            style={
              styles.optionsHint
            }
          >
            Tap to choose
          </Text>
        </View>

        <View
          style={styles.options}
        >
          {questionOptions.map(
            (option, index) => {
              const selected =
                currentAnswer?.selectedIndex ===
                index;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.option,
                    selected &&
                      styles.optionSelected,
                  ]}
                  activeOpacity={0.78}
                  onPress={() =>
                    selectOption(
                      question._id,
                      index
                    )
                  }
                >
                  <View
                    style={[
                      styles.optionLetter,
                      selected &&
                        styles.optionLetterSelected,
                    ]}
                  >
                    {selected ? (
                      <Ionicons
                        name="checkmark"
                        size={15}
                        color="#FFFFFF"
                      />
                    ) : (
                      <Text
                        style={
                          styles.optionLetterText
                        }
                      >
                        {String.fromCharCode(
                          65 +
                            index
                        )}
                      </Text>
                    )}
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      selected &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>

                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={
                        colors.brand
                      }
                    />
                  )}
                </TouchableOpacity>
              );
            }
          )}
        </View>

        <View
          style={
            styles.questionBottomSpace
          }
        />
      </ScrollView>

      {/* ===================================================
          FOOTER
      =================================================== */}

      <View
        style={[
          styles.footer,
          {
            paddingBottom:
              Math.max(
                insets.bottom +
                  10,
                12
              ),
          },
        ]}
      >
        <TouchableOpacity
          style={
            styles.clearButton
          }
          activeOpacity={0.75}
          onPress={() =>
            clearResponse(
              question._id
            )
          }
        >
          <Ionicons
            name="close-outline"
            size={17}
            color={colors.slate}
          />

          <Text
            style={
              styles.clearButtonText
            }
          >
            Clear
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.reviewButton
          }
          activeOpacity={0.78}
          onPress={
            markForReviewAndNext
          }
        >
          <Ionicons
            name="flag-outline"
            size={15}
            color={colors.flag}
          />

          <Text
            style={
              styles.reviewButtonText
            }
          >
            Mark
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.nextButton
          }
          activeOpacity={0.85}
          disabled={submitting}
          onPress={
            isLastQuestion
              ? confirmSubmit
              : saveAndNext
          }
        >
          {submitting ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
            />
          ) : (
            <>
              <Text
                style={
                  styles.nextButtonText
                }
              >
                {isLastQuestion
                  ? "Submit Test"
                  : "Save & Next"}
              </Text>

              <Ionicons
                name={
                  isLastQuestion
                    ? "checkmark-circle"
                    : "arrow-forward"
                }
                size={16}
                color="#FFFFFF"
              />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ===================================================
          QUESTION PALETTE
      =================================================== */}

      <Modal
        visible={paletteVisible}
        animationType="slide"
        onRequestClose={() =>
          setPaletteVisible(false)
        }
      >
        <View
          style={[
            styles.paletteContainer,
            {
              paddingTop:
                insets.top + 8,
            },
          ]}
        >
          <View
            style={
              styles.paletteHeader
            }
          >
            <View>
              <Text
                style={
                  styles.paletteTitle
                }
              >
                Question Palette
              </Text>

              <Text
                style={
                  styles.paletteSubtitle
                }
              >
                {attemptedCount} answered
                {"  ·  "}
                {markedCount} marked
              </Text>
            </View>

            <TouchableOpacity
              style={
                styles.closeButton
              }
              onPress={() =>
                setPaletteVisible(
                  false
                )
              }
            >
              <Ionicons
                name="close"
                size={20}
                color={colors.ink}
              />
            </TouchableOpacity>
          </View>

          <View
            style={
              styles.legendRow
            }
          >
            <LegendItem
              color={colors.success}
              label="Answered"
            />

            <LegendItem
              color={colors.flag}
              label="Review"
            />

            <LegendItem
              color={colors.slate}
              label="Visited"
            />

            <LegendItem
              color={colors.border}
              label="Unseen"
              outline
            />
          </View>

          <FlatList
            data={sections}
            keyExtractor={(section) =>
              section.subject
            }
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.paletteList
            }
            renderItem={({
              item: section,
            }) => {
              const counts = {
                marked: 0,
                attempted: 0,
                unattempted: 0,
                unseen: 0,
              };

              section.indices.forEach(
                (index) => {
                  counts[
                    paletteStatus(
                      test.questions[
                        index
                      ]
                    )
                  ]++;
                }
              );

              return (
                <View
                  style={
                    styles.paletteSection
                  }
                >
                  <View
                    style={
                      styles.paletteSectionHeader
                    }
                  >
                    <Text
                      style={
                        styles.sectionHeading
                      }
                    >
                      {
                        section.subject
                      }
                    </Text>

                    <Text
                      style={
                        styles.sectionCounts
                      }
                    >
                      {counts.attempted}{" "}
                      answered
                    </Text>
                  </View>

                  <View
                    style={
                      styles.grid
                    }
                  >
                    {section.indices.map(
                      (index) => {
                        const status =
                          paletteStatus(
                            test.questions[
                              index
                            ]
                          );

                        const isCurrent =
                          index ===
                          currentIdx;

                        return (
                          <TouchableOpacity
                            key={
                              index
                            }
                            style={[
                              styles.gridItem,
                              {
                                backgroundColor:
                                  status ===
                                  "unseen"
                                    ? "#FFFFFF"
                                    : statusColors[
                                        status
                                      ],
                              },
                              status ===
                                "unseen" &&
                                styles.gridItemUnseen,
                              isCurrent &&
                                styles.gridItemCurrent,
                            ]}
                            activeOpacity={
                              0.75
                            }
                            onPress={() =>
                              goToQuestion(
                                index
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.gridItemText,
                                status ===
                                  "unseen" &&
                                  styles.gridItemTextDark,
                              ]}
                            >
                              {index +
                                1}
                            </Text>
                          </TouchableOpacity>
                        );
                      }
                    )}
                  </View>
                </View>
              );
            }}
          />

          <View
            style={[
              styles.paletteFooter,
              {
                paddingBottom:
                  Math.max(
                    insets.bottom +
                      8,
                    12
                  ),
              },
            ]}
          >
            <TouchableOpacity
              style={
                styles.paletteSubmit
              }
              activeOpacity={0.85}
              onPress={() => {
                setPaletteVisible(
                  false
                );
                confirmSubmit();
              }}
            >
              <Ionicons
                name="checkmark-circle"
                size={17}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.paletteSubmitText
                }
              >
                Submit Test
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ===================================================
          INSTRUCTIONS
      =================================================== */}

      <Modal
        visible={
          instructionsVisible
        }
        animationType="fade"
        transparent
        onRequestClose={() =>
          setInstructionsVisible(
            false
          )
        }
      >
        <View
          style={
            styles.instructionsOverlay
          }
        >
          <View
            style={
              styles.instructionsBox
            }
          >
            <View
              style={
                styles.instructionsIcon
              }
            >
              <Ionicons
                name="information-circle"
                size={22}
                color={colors.brand}
              />
            </View>

            <Text
              style={
                styles.instructionsTitle
              }
            >
              Test Instructions
            </Text>

            <Text
              style={
                styles.instructionsSubtitle
              }
            >
              Keep these points in mind
              before submitting.
            </Text>

            <InstructionRow
              icon="checkmark-circle"
              text={`Correct answer earns +${marksPerQ} marks`}
              color={colors.success}
            />

            <InstructionRow
              icon="remove-circle"
              text={`Wrong answer costs −${negMark} marks`}
              color={colors.danger}
            />

            <InstructionRow
              icon="flag"
              text="Mark & Next flags the question for review and keeps your answer."
              color={colors.flag}
            />

            <InstructionRow
              icon="close-circle"
              text="Clear removes the selected answer."
              color={colors.slate}
            />

            <InstructionRow
              icon="time"
              text="The test submits automatically when the timer reaches zero."
              color={colors.brand}
            />

            <TouchableOpacity
              style={
                styles.gotItButton
              }
              activeOpacity={0.85}
              onPress={() =>
                setInstructionsVisible(
                  false
                )
              }
            >
              <Text
                style={
                  styles.gotItText
                }
              >
                Got it
              </Text>

              <Ionicons
                name="arrow-forward"
                size={16}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* =========================================================
   LEGEND
========================================================= */

function LegendItem({
  color,
  label,
  outline = false,
}) {
  return (
    <View
      style={styles.legendItem}
    >
      <View
        style={[
          styles.legendDot,
          {
            backgroundColor:
              outline
                ? "#FFFFFF"
                : color,
            borderColor:
              color,
          },
        ]}
      />

      <Text
        style={styles.legendText}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   INSTRUCTION ROW
========================================================= */

function InstructionRow({
  icon,
  text,
  color,
}) {
  return (
    <View
      style={
        styles.instructionRow
      }
    >
      <View
        style={[
          styles.instructionIcon,
          {
            backgroundColor:
              `${color}16`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={15}
          color={color}
        />
      </View>

      <Text
        style={
          styles.instructionText
        }
      >
        {text}
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =====================================================
       GENERAL
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    loadingScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.bg,
      paddingHorizontal: 30,
    },

    loadingIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 13,
    },

    loadingTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
      color: colors.ink,
    },

    loadingText: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.slateSoft,
      marginTop: 4,
    },

    emptyScreen: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.bg,
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 68,
      height: 68,
      borderRadius: 22,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    emptyTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: colors.ink,
    },

    emptyText: {
      fontSize: 12,
      lineHeight: 19,
      color: colors.slate,
      textAlign: "center",
      marginTop: 6,
      maxWidth: 290,
    },

    backButton: {
      marginTop: 20,
      paddingHorizontal: 22,
      height: 42,
      borderRadius:
        radius.md,
      backgroundColor:
        colors.brand,
      alignItems: "center",
      justifyContent:
        "center",
    },

    backButtonText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "800",
    },

    /* =====================================================
       TOP BAR
    ===================================================== */

    topBar: {
      minHeight: 69,
      paddingHorizontal:
        spacing.md,
      paddingBottom: 9,
      backgroundColor:
        colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
    },

    topLeft: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
    },

    testIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    titleWrap: {
      flex: 1,
      minWidth: 0,
    },

    testTitle: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
    },

    instructionsLink: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.brand,
      fontWeight: "700",
      marginTop: 1,
    },

    timerBox: {
      height: 36,
      minWidth: 74,
      paddingHorizontal: 9,
      borderRadius: 11,
      backgroundColor:
        colors.brandTint,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 5,
    },

    timerBoxDanger: {
      backgroundColor:
        colors.dangerLight,
    },

    timerText: {
      fontSize: 13,
      fontWeight: "900",
      color: colors.brand,
      fontVariant:
        ["tabular-nums"],
    },

    timerTextDanger: {
      color: colors.danger,
    },

    paletteButton: {
      width: 36,
      height: 36,
      borderRadius: 11,
      backgroundColor:
        colors.slateLight,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    /* =====================================================
       PROGRESS
    ===================================================== */

    progressTrack: {
      height: 3,
      backgroundColor:
        colors.slateLight,
    },

    progressFill: {
      height: 3,
      backgroundColor:
        colors.brand,
    },

    /* =====================================================
       SECTION TABS
    ===================================================== */

    sectionTabsWrap: {
      backgroundColor:
        colors.surface,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
    },

    sectionTabsContent: {
      paddingHorizontal:
        spacing.md,
      paddingVertical: 7,
      gap: 7,
    },

    sectionTab: {
      minHeight: 34,
      maxWidth: 170,
      paddingHorizontal: 11,
      borderRadius: 10,
      backgroundColor:
        colors.slateLight,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },

    sectionTabActive: {
      backgroundColor:
        colors.brandTint,
      borderWidth: 1,
      borderColor:
        colors.brandLight,
    },

    sectionTabText: {
      fontSize: 11,
      fontWeight: "700",
      color: colors.slate,
      flexShrink: 1,
    },

    sectionTabTextActive: {
      color: colors.brand,
      fontWeight: "800",
    },

    sectionCount: {
      minWidth: 22,
      height: 20,
      borderRadius: 10,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
    },

    sectionCountActive: {
      backgroundColor:
        colors.brand,
    },

    sectionCountText: {
      fontSize: 8,
      fontWeight: "800",
      color: colors.slateSoft,
    },

    sectionCountTextActive: {
      color: "#FFFFFF",
    },

    /* =====================================================
       QUESTION META
    ===================================================== */

    questionMeta: {
      minHeight: 58,
      paddingHorizontal:
        spacing.md,
      paddingVertical: 8,
      backgroundColor:
        colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
    },

    questionNumber: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        colors.ink,
      alignItems: "center",
      justifyContent:
        "center",
    },

    questionNumberText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },

    questionMetaText: {
      minWidth: 45,
    },

    questionLabel: {
      fontSize: 7,
      lineHeight: 10,
      color: colors.slateSoft,
      fontWeight: "900",
      letterSpacing: 0.7,
    },

    questionPosition: {
      fontSize: 9,
      lineHeight: 12,
      color: colors.slate,
      fontWeight: "600",
      marginTop: 1,
    },

    questionTime: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor:
        colors.slateLight,
    },

    questionTimeText: {
      fontSize: 9.5,
      fontWeight: "700",
      color: colors.slate,
      fontVariant:
        ["tabular-nums"],
    },

    marksGroup: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },

    positiveBadge: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 7,
      backgroundColor:
        colors.successLight,
    },

    positiveText: {
      fontSize: 9,
      fontWeight: "900",
      color: colors.success,
    },

    negativeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: 7,
      backgroundColor:
        colors.dangerLight,
    },

    negativeText: {
      fontSize: 9,
      fontWeight: "900",
      color: colors.danger,
    },

    metaIconButton: {
      width: 31,
      height: 31,
      borderRadius: 9,
      backgroundColor:
        colors.slateLight,
      alignItems: "center",
      justifyContent:
        "center",
    },

    metaIconButtonActive: {
      backgroundColor:
        colors.brandTint,
      borderWidth: 1,
      borderColor:
        colors.brandLight,
    },

    languageToggle: {
      flexDirection: "row",
      padding: 2,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.slateLight,
    },

    languageOption: {
      minWidth: 29,
      height: 25,
      borderRadius:
        radius.full,
      alignItems: "center",
      justifyContent:
        "center",
    },

    languageActive: {
      backgroundColor:
        colors.brand,
    },

    languageText: {
      fontSize: 8.5,
      fontWeight: "900",
      color: colors.slate,
    },

    languageTextActive: {
      color: "#FFFFFF",
    },

    /* =====================================================
       QUESTION
    ===================================================== */

    questionArea: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    questionContent: {
      paddingHorizontal:
        spacing.lg,
      paddingTop: 18,
      paddingBottom: 20,
    },

    questionHeader: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 12,
    },

    subjectPill: {
      maxWidth: "62%",
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.brandTint,
    },

    subjectPillText: {
      fontSize: 8.5,
      fontWeight: "800",
      color: colors.brand,
      flexShrink: 1,
    },

    answeredPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.successLight,
    },

    answeredPillText: {
      fontSize: 8,
      fontWeight: "800",
      color: colors.success,
    },

    reviewPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.flagLight,
    },

    reviewPillText: {
      fontSize: 8,
      fontWeight: "800",
      color: colors.flag,
    },

    questionText: {
      fontSize: 18,
      lineHeight: 27,
      fontWeight: "700",
      color: colors.ink,
      letterSpacing: -0.15,
      marginBottom: 22,
    },

    optionsHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 9,
    },

    optionsLabel: {
      fontSize: 8,
      fontWeight: "900",
      color: colors.slateSoft,
      letterSpacing: 0.7,
    },

    optionsHint: {
      fontSize: 8.5,
      fontWeight: "600",
      color: colors.slateSoft,
    },

    options: {
      gap: 10,
    },

    option: {
      minHeight: 58,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 15,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      flexDirection: "row",
      alignItems: "center",
      ...shadow.soft,
    },

    optionSelected: {
      backgroundColor:
        colors.brandTint,
      borderColor:
        colors.brand,
      borderWidth: 1.5,
    },

    optionLetter: {
      width: 34,
      height: 34,
      borderRadius: 11,
      backgroundColor:
        colors.slateLight,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 11,
      flexShrink: 0,
    },

    optionLetterSelected: {
      backgroundColor:
        colors.brand,
    },

    optionLetterText: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.slate,
    },

    optionText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: colors.ink,
      fontWeight: "600",
    },

    optionTextSelected: {
      color: colors.brand,
      fontWeight: "800",
    },

    questionBottomSpace: {
      height: 20,
    },

    /* =====================================================
       FOOTER
    ===================================================== */

    footer: {
      minHeight: 74,
      paddingHorizontal:
        spacing.md,
      paddingTop: 9,
      backgroundColor:
        colors.surface,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      ...shadow.lg,
    },

    clearButton: {
      height: 47,
      minWidth: 65,
      paddingHorizontal: 10,
      borderRadius: 13,
      backgroundColor:
        colors.slateLight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 3,
    },

    clearButtonText: {
      fontSize: 10.5,
      fontWeight: "800",
      color: colors.slate,
    },

    reviewButton: {
      height: 47,
      minWidth: 72,
      paddingHorizontal: 10,
      borderRadius: 13,
      backgroundColor:
        colors.flagLight,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 4,
    },

    reviewButtonText: {
      fontSize: 10.5,
      fontWeight: "800",
      color: colors.flag,
    },

    nextButton: {
      flex: 1,
      height: 47,
      minWidth: 120,
      paddingHorizontal: 12,
      borderRadius: 13,
      backgroundColor:
        colors.brand,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
      ...shadow.brand,
    },

    nextButtonText: {
      color: "#FFFFFF",
      fontSize: 12.5,
      fontWeight: "900",
    },

    /* =====================================================
       PALETTE
    ===================================================== */

    paletteContainer: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    paletteHeader: {
      minHeight: 65,
      paddingHorizontal:
        spacing.lg,
      paddingBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        colors.surface,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
    },

    paletteTitle: {
      fontSize: 19,
      fontWeight: "900",
      color: colors.ink,
    },

    paletteSubtitle: {
      fontSize: 10,
      color: colors.slate,
      marginTop: 3,
      fontWeight: "600",
    },

    closeButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        colors.slateLight,
      alignItems: "center",
      justifyContent:
        "center",
    },

    legendRow: {
      paddingHorizontal:
        spacing.lg,
      paddingVertical: 10,
      backgroundColor:
        colors.surface,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },

    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },

    legendDot: {
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 1.5,
    },

    legendText: {
      fontSize: 9.5,
      color: colors.slate,
      fontWeight: "600",
    },

    paletteList: {
      paddingHorizontal:
        spacing.lg,
      paddingTop: 16,
      paddingBottom: 25,
    },

    paletteSection: {
      marginBottom: 23,
    },

    paletteSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 9,
    },

    sectionHeading: {
      fontSize: 14,
      fontWeight: "900",
      color: colors.ink,
    },

    sectionCounts: {
      fontSize: 9,
      color: colors.slateSoft,
      fontWeight: "700",
    },

    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
    },

    gridItem: {
      width: 41,
      height: 41,
      borderRadius: 11,
      alignItems: "center",
      justifyContent:
        "center",
    },

    gridItemUnseen: {
      borderWidth: 1.5,
      borderColor:
        colors.border,
    },

    gridItemCurrent: {
      borderWidth: 2,
      borderColor:
        colors.ink,
    },

    gridItemText: {
      fontSize: 11,
      fontWeight: "900",
      color: "#FFFFFF",
    },

    gridItemTextDark: {
      color: colors.ink,
    },

    paletteFooter: {
      paddingHorizontal:
        spacing.lg,
      paddingTop: 9,
      backgroundColor:
        colors.surface,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    paletteSubmit: {
      height: 49,
      borderRadius: 14,
      backgroundColor:
        colors.success,
      alignItems: "center",
      justifyContent:
        "center",
      flexDirection: "row",
      gap: 7,
      ...shadow.soft,
    },

    paletteSubmitText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },

    /* =====================================================
       INSTRUCTIONS
    ===================================================== */

    instructionsOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(15,23,42,0.58)",
      alignItems: "center",
      justifyContent:
        "center",
      paddingHorizontal: 22,
    },

    instructionsBox: {
      width: "100%",
      maxWidth: 420,
      backgroundColor:
        colors.surface,
      borderRadius: 23,
      padding: 20,
      ...shadow.lg,
    },

    instructionsIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent:
        "center",
      marginBottom: 12,
    },

    instructionsTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: colors.ink,
    },

    instructionsSubtitle: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.slate,
      marginTop: 3,
      marginBottom: 8,
    },

    instructionRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 10,
    },

    instructionIcon: {
      width: 31,
      height: 31,
      borderRadius: 10,
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    instructionText: {
      flex: 1,
      fontSize: 11.5,
      lineHeight: 17,
      color: colors.ink,
      fontWeight: "600",
    },

    gotItButton: {
      height: 47,
      borderRadius: 13,
      backgroundColor:
        colors.brand,
      marginTop: 19,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 7,
      ...shadow.brand,
    },

    gotItText: {
      color: "#FFFFFF",
      fontSize: 13,
      fontWeight: "900",
    },
  });