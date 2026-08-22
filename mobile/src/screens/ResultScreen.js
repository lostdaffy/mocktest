import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  spacing,
  radius,
  shadow,
  card,
} from "../theme/theme";

/* =========================================================
   LANGUAGE HELPERS
========================================================= */

function normalizeLanguage(language) {
  if (!language) return "en";

  const value = String(language)
    .trim()
    .toLowerCase();

  if (
    value === "hi" ||
    value === "hindi" ||
    value.startsWith("hi-")
  ) {
    return "hi";
  }

  if (
    value === "en" ||
    value === "english" ||
    value.startsWith("en-")
  ) {
    return "en";
  }

  return value;
}

/**
 * Detect language used for the test.
 *
 * Supported:
 * attempt.language
 * attempt.testLanguage
 * attempt.languageCode
 * attempt.test.language
 * attempt.test.languageCode
 * question.language
 */
function getTestLanguage(
  attempt,
  question
) {
  return normalizeLanguage(
    attempt?.language ||
      attempt?.testLanguage ||
      attempt?.languageCode ||
      attempt?.test?.language ||
      attempt?.test?.languageCode ||
      question?.language ||
      question?.languageCode ||
      "en"
  );
}

/**
 * Get solution in the language
 * used by the test.
 *
 * Supported API formats:
 *
 * question.solution
 * question.solutionText
 *
 * question.solutionTranslations
 * {
 *   en: "...",
 *   hi: "..."
 * }
 *
 * question.solutions
 * {
 *   en: "...",
 *   hi: "..."
 * }
 *
 * question.solutionHi
 * question.solutionEn
 *
 * question.hindiSolution
 * question.englishSolution
 *
 * NOTE: none of these translation-object formats are actually populated
 * by the backend today (Question documents only ever store a single
 * `solution` field, in whatever language the source paper/generation used
 * - there's no per-language solution storage yet). This function is
 * future-proofed for if/when that's added, but right now every path here
 * falls through to the plain `question.solution` fallback at the bottom -
 * which is why the "language" badge next to a solution should be read as
 * "the test's language", not "this solution was translated for you".
 */
function getLocalizedSolution(
  question,
  language
) {
  if (!question) return "";

  const lang =
    normalizeLanguage(language);

  const translations =
    question.solutionTranslations ||
    question.solutions ||
    question.translation?.solution ||
    question.translations?.solution;

  /* -------------------------------------------------------
     OBJECT TRANSLATIONS
  ------------------------------------------------------- */

  if (
    translations &&
    typeof translations === "object" &&
    !Array.isArray(translations)
  ) {
    const possibleKeys = [
      lang,
      language,
      lang === "hi"
        ? "hindi"
        : "english",
      lang === "hi"
        ? "hi-IN"
        : "en-IN",
    ];

    for (const key of possibleKeys) {
      if (
        typeof translations[key] ===
          "string" &&
        translations[key].trim()
      ) {
        return translations[key];
      }
    }
  }

  /* -------------------------------------------------------
     ARRAY TRANSLATIONS
  ------------------------------------------------------- */

  if (Array.isArray(translations)) {
    const match =
      translations.find(
        (item) =>
          normalizeLanguage(
            item?.language ||
              item?.languageCode ||
              item?.lang
          ) === lang
      );

    if (
      match?.solution ||
      match?.text
    ) {
      return (
        match.solution ||
        match.text
      );
    }
  }

  /* -------------------------------------------------------
     EXPLICIT LANGUAGE FIELDS
  ------------------------------------------------------- */

  if (lang === "hi") {
    if (
      typeof question.solutionHi ===
        "string" &&
      question.solutionHi.trim()
    ) {
      return question.solutionHi;
    }

    if (
      typeof question.hindiSolution ===
        "string" &&
      question.hindiSolution.trim()
    ) {
      return question.hindiSolution;
    }
  }

  if (lang === "en") {
    if (
      typeof question.solutionEn ===
        "string" &&
      question.solutionEn.trim()
    ) {
      return question.solutionEn;
    }

    if (
      typeof question.englishSolution ===
        "string" &&
      question.englishSolution.trim()
    ) {
      return question.englishSolution;
    }
  }

  /* -------------------------------------------------------
     FALLBACK
  ------------------------------------------------------- */

  return (
    question.solution ||
    question.solutionText ||
    ""
  );
}

/* =========================================================
   RESULT SCREEN
========================================================= */

export default function ResultScreen({
  route,
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const { attemptId } =
    route.params;

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const scrollRef = useRef(null);
  const mistakesY = useRef(0);

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    try {
      const res =
        await api.get(
          `/tests/attempts/${attemptId}`
        );

      setData(res.data);
    } catch (err) {
      console.log(
        "Result loading error:",
        err
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading || !data) {
    return (
      <View
        style={styles.centered}
      >
        <ActivityIndicator
          size="large"
          color={colors.brand}
        />

        <Text
          style={styles.loadingText}
        >
          Preparing your result...
        </Text>
      </View>
    );
  }

  const {
    attempt,
    insight,
  } = data;

  const answers =
    attempt.answers || [];

  const testLanguage =
    getTestLanguage(
      attempt,
      answers?.[0]?.question
    );

  const wrongAnswers =
    answers.filter(
      (a) =>
        a.question &&
        !a.isCorrect &&
        a.selectedIndex !== null
    );

  const pct =
    attempt.totalMarks > 0
      ? Math.round(
          (attempt.score /
            attempt.totalMarks) *
            100
        )
      : 0;

  const safePct =
    Math.max(
      0,
      Math.min(100, pct)
    );

  const scoreColor =
    safePct >= 80
      ? colors.success
      : safePct >= 40
      ? colors.brand
      : colors.danger;

  const completedDate =
    attempt.submittedAt ||
    attempt.createdAt;

  const performanceText =
    pct >= 80
      ? "Excellent performance"
      : pct >= 60
      ? "Good progress"
      : pct >= 40
      ? "Keep improving"
      : "More practice needed";

  const correctCount =
    attempt.correctCount || 0;

  const wrongCount =
    attempt.wrongCount || 0;

  const skippedCount =
    attempt.skippedCount || 0;

  // "View Solutions" scrolls down to the mistakes review below instead of
  // doing nothing - that section already IS the solutions review, no
  // separate screen needed for it.
  function scrollToMistakes() {
    scrollRef.current?.scrollTo({
      y: Math.max(mistakesY.current - 12, 0),
      animated: true,
    });
  }

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.container}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop: Math.max(
            insets.top + 12,
            spacing.lg
          ),
          paddingBottom:
            spacing.xxl +
            insets.bottom,
        },
      ]}
      showsVerticalScrollIndicator={
        false
      }
    >
      {/* =================================================
          TEST IDENTITY
      ================================================= */}

      <View
        style={styles.testCard}
      >
        <View
          style={styles.testIcon}
        >
          <Ionicons
            name="document-text"
            size={19}
            color={colors.brand}
          />
        </View>

        <View
          style={styles.testInfo}
        >
          <Text
            style={styles.testTitle}
            numberOfLines={2}
          >
            {attempt.testTitle ||
              "Test"}
          </Text>

          <View
            style={styles.testMetaRow}
          >
            <Text
              style={styles.testDate}
            >
              Completed on{" "}
              {completedDate
                ? new Date(
                    completedDate
                  ).toLocaleDateString(
                    "en-IN",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }
                  )
                : "—"}
            </Text>

            <View
              style={
                styles.languageBadge
              }
            >
              <Text
                style={
                  styles.languageBadgeText
                }
              >
                {testLanguage === "hi"
                  ? "हिंदी"
                  : "English"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* =================================================
          SCORE HERO
      ================================================= */}

      <View
        style={styles.scoreSection}
      >
        <Text
          style={styles.scoreEyebrow}
        >
          TEST RESULT
        </Text>

        <Text
          style={styles.performanceText}
          numberOfLines={2}
        >
          {performanceText}
        </Text>

        {/* MAIN SCORE */}

        <View
          style={styles.scoreBlock}
        >
          <Text
            style={[
              styles.scorePercentage,
              {
                color: scoreColor,
              },
            ]}
          >
            {pct}%
          </Text>

          <View
            style={styles.scoreLine}
          >
            <Text
              style={styles.scoreNumber}
            >
              {attempt.score}
            </Text>

            <Text
              style={styles.scoreTotal}
            >
              / {attempt.totalMarks}
            </Text>
          </View>

          <Text
            style={styles.scoreLabel}
          >
            TOTAL SCORE
          </Text>
        </View>

    
        {/* SCORE META */}

        <View
          style={styles.metaRow}
        >
          <ScoreMeta
            value={correctCount}
            label="Correct"
          />

          <View
            style={styles.metaDivider}
          />

          <ScoreMeta
            value={wrongCount}
            label="Incorrect"
          />

          <View
            style={styles.metaDivider}
          />

          <ScoreMeta
            value={
              attempt.rank ||
              "—"
            }
            label={
              attempt.totalParticipants
                ? `Rank / ${attempt.totalParticipants}`
                : "Rank"
            }
          />
        </View>
      </View>

      {/* =================================================
          PERFORMANCE ANALYSIS
      ================================================= */}

      <View
        style={styles.analysisCard}
      >
        <View
          style={
            styles.cardHeadingRow
          }
        >
          <View
            style={styles.headingContent}
          >
            <Text
              style={
                styles.analysisTitle
              }
            >
              Performance Analysis
            </Text>

            <Text
              style={
                styles.cardSubtitle
              }
            >
              Your question-wise performance
            </Text>
          </View>

          <View
            style={
              styles.analysisIcon
            }
          >
            <Ionicons
              name="stats-chart"
              size={17}
              color={colors.brand}
            />
          </View>
        </View>

        <View
          style={styles.analysisRow}
        >
          <AnalysisStat
            dotColor={
              colors.success
            }
            value={correctCount}
            label="Correct"
          />

          <AnalysisStat
            dotColor={
              colors.danger
            }
            value={wrongCount}
            label="Incorrect"
          />

          <AnalysisStat
            dotColor={
              colors.slateSoft
            }
            value={skippedCount}
            label="Unattempted"
          />
        </View>
      </View>

      {/* =================================================
          INSIGHT
      ================================================= */}

      {insight?.note ? (
        <View
          style={styles.insightCard}
        >
          <View
            style={styles.insightIcon}
          >
            <Ionicons
              name="bulb"
              size={17}
              color={colors.brand}
            />
          </View>

          <View
            style={
              styles.insightContent
            }
          >
            <Text
              style={
                styles.insightTitle
              }
            >
              Speed vs accuracy
            </Text>

            <Text
              style={styles.insightText}
            >
              {insight.note}
            </Text>
          </View>
        </View>
      ) : null}

      {/* =================================================
          SOLUTIONS BUTTON
      ================================================= */}

      <TouchableOpacity
        style={
          styles.solutionsButton
        }
        activeOpacity={0.88}
        onPress={scrollToMistakes}
      >
        <View
          style={
            styles.solutionButtonIcon
          }
        >
          <Ionicons
            name="document-text-outline"
            size={18}
            color="#fff"
          />
        </View>

        <View
          style={
            styles.solutionButtonContent
          }
        >
          <Text
            style={
              styles.solutionsButtonText
            }
          >
            View Solutions
          </Text>

          <Text
            style={
              styles.solutionsButtonSub
            }
          >
            Review questions and answers
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color="rgba(255,255,255,0.7)"
        />
      </TouchableOpacity>

      {/* =================================================
          MISTAKES HEADER
      ================================================= */}

      <View
        style={styles.sectionHeader}
        onLayout={(e) => {
          mistakesY.current = e.nativeEvent.layout.y;
        }}
      >
        <View
          style={
            styles.sectionHeaderText
          }
        >
          <Text
            style={styles.sectionTitle}
          >
            Learn from mistakes
          </Text>

          <Text
            style={
              styles.sectionSubtitle
            }
          >
            Review questions you missed
          </Text>
        </View>

        {wrongAnswers.length >
          0 && (
          <View
            style={styles.countBadge}
          >
            <Text
              style={
                styles.countBadgeText
              }
            >
              {wrongAnswers.length}
            </Text>
          </View>
        )}
      </View>

      {/* =================================================
          NO MISTAKES
      ================================================= */}

      {wrongAnswers.length ===
      0 ? (
        <View
          style={
            styles.allCorrectBox
          }
        >
          <View
            style={
              styles.allCorrectIcon
            }
          >
            <Ionicons
              name="checkmark"
              size={21}
              color={colors.success}
            />
          </View>

          <View
            style={
              styles.allCorrectContent
            }
          >
            <Text
              style={
                styles.allCorrectTitle
              }
            >
              No mistakes
            </Text>

            <Text
              style={
                styles.allCorrectText
              }
            >
              Outstanding work — all
              attempted questions were
              correct.
            </Text>
          </View>
        </View>
      ) : (
        wrongAnswers.map(
          (answer, idx) => (
            <WrongAnswerCard
              key={idx}
              answer={answer}
              index={idx}
              language={getTestLanguage(
                attempt,
                answer.question
              )}
            />
          )
        )
      )}

      {/* =================================================
          ACTIONS
      ================================================= */}

      <TouchableOpacity
        style={
          styles.primaryButton
        }
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate(
            "Analysis"
          )
        }
      >
        <Ionicons
          name="stats-chart"
          size={18}
          color="#fff"
        />

        <Text
          style={
            styles.primaryButtonText
          }
        >
          View Full Analysis
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={
          styles.secondaryButton
        }
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(
            "Home"
          )
        }
      >
        <Text
          style={
            styles.secondaryButtonText
          }
        >
          Back to Home
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/* =========================================================
   SCORE META
========================================================= */

function ScoreMeta({
  value,
  label,
}) {
  return (
    <View
      style={styles.metaItem}
    >
      <Text
        style={styles.metaValue}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
      >
        {value}
      </Text>

      <Text
        style={styles.metaLabel}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   ANALYSIS STAT
========================================================= */

function AnalysisStat({
  dotColor,
  value,
  label,
}) {
  return (
    <View
      style={styles.analysisStat}
    >
      <View
        style={styles.analysisTop}
      >
        <View
          style={[
            styles.dot,
            {
              backgroundColor:
                dotColor,
            },
          ]}
        />

        <Text
          style={styles.analysisLabel}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>

      <Text
        style={styles.analysisValue}
      >
        {value}
      </Text>
    </View>
  );
}

/* =========================================================
   WRONG ANSWER CARD
========================================================= */

function WrongAnswerCard({
  answer,
  index,
  language,
}) {
  const question =
    answer.question;

  if (!question) return null;

  const selectedAnswer =
    question.options?.[
      answer.selectedIndex
    ];

  const correctAnswer =
    question.options?.[
      question.correctIndex
    ];

  const solution =
    getLocalizedSolution(
      question,
      language
    );

  return (
    <View
      style={styles.wrongCard}
    >
      {/* QUESTION */}

      <View
        style={styles.questionRow}
      >
        <View
          style={
            styles.questionNumber
          }
        >
          <Text
            style={
              styles.questionNumberText
            }
          >
            Q{index + 1}
          </Text>
        </View>

        <Text
          style={styles.wrongQuestion}
        >
          {question.text}
        </Text>
      </View>

      {/* ANSWERS */}

      <View
        style={styles.answerBox}
      >
        <View
          style={styles.answerRow}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={colors.danger}
          />

          <View
            style={
              styles.answerContent
            }
          >
            <Text
              style={
                styles.answerLabel
              }
            >
              You chose
            </Text>

            <Text
              style={
                styles.wrongAnswerText
              }
            >
              {selectedAnswer ||
                "—"}
            </Text>
          </View>
        </View>

        <View
          style={styles.answerDivider}
        />

        <View
          style={styles.answerRow}
        >
          <Ionicons
            name="checkmark-circle"
            size={18}
            color={colors.success}
          />

          <View
            style={
              styles.answerContent
            }
          >
            <Text
              style={
                styles.answerLabel
              }
            >
              Correct answer
            </Text>

            <Text
              style={
                styles.correctAnswerText
              }
            >
              {correctAnswer ||
                "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* SOLUTION */}

      {solution ? (
        <View
          style={styles.solutionBox}
        >
          <View
            style={
              styles.solutionHeader
            }
          >
            <View
              style={
                styles.solutionIcon
              }
            >
              <Ionicons
                name="bulb-outline"
                size={14}
                color={colors.brand}
              />
            </View>

            <Text
              style={
                styles.solutionLabel
              }
            >
              SOLUTION
            </Text>

            <Text
              style={
                styles.solutionLanguage
              }
            >
              {language === "hi"
                ? "हिंदी"
                : "English"}
            </Text>
          </View>

          <Text
            style={styles.solutionText}
          >
            {solution}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.bg,
  },

  contentContainer: {
    paddingHorizontal:
      spacing.lg,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor:
      colors.bg,
  },

  loadingText: {
    fontSize: 13,
    color: colors.slate,
    fontWeight: "600",
    marginTop: 12,
  },

  /* =====================================================
     TEST CARD
  ===================================================== */

  testCard: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    marginBottom: 20,
  },

  testIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor:
      colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  testInfo: {
    flex: 1,
    minWidth: 0,
  },

  testTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.ink,
  },

  testMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 5,
  },

  testDate: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.slate,
    fontWeight: "500",
  },

  languageBadge: {
    marginLeft: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    backgroundColor:
      colors.brandTint,
  },

  languageBadgeText: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.brand,
    fontWeight: "800",
  },

  /* =====================================================
     SCORE HERO
  ===================================================== */

  scoreSection: {
    alignItems: "center",
    marginBottom: 23,
    paddingHorizontal: 4,
  },

  scoreEyebrow: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "800",
    color: colors.slateSoft,
    letterSpacing: 1.4,
  },

  performanceText: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    marginTop: 5,
    marginBottom: 17,
  },

  /* =====================================================
     MAIN SCORE
  ===================================================== */

  scoreBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    marginBottom: 2,
  },

  scorePercentage: {
    fontSize: 50,
    lineHeight: 57,
    fontWeight: "900",
    letterSpacing: -1.8,
  },

  scoreLine: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: 1,
  },

  scoreNumber: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.ink,
  },

  scoreTotal: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: colors.slateSoft,
    marginLeft: 3,
  },

  scoreLabel: {
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "800",
    color: colors.slateSoft,
    letterSpacing: 1.2,
    marginTop: 4,
  },

  /* =====================================================
     ACCURACY (unused - kept only because the earlier design had a
     standalone accuracy pill here; this version shows accuracy via the
     big percentage in the score hero instead, so nothing in the JSX
     references these anymore. Harmless, but flagging in case you want
     them removed too.)
  ===================================================== */

  accuracyPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    marginTop: 15,
  },

  accuracyDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },

  accuracyText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
  },

  /* =====================================================
     SCORE META
  ===================================================== */

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 19,
    width: "100%",
    minHeight: 48,
  },

  metaItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
  },

  metaValue: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.ink,
  },

  metaLabel: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 2,
    textAlign: "center",
  },

  metaDivider: {
    width: 1,
    height: 32,
    backgroundColor:
      colors.border,
  },

  /* =====================================================
     ANALYSIS
  ===================================================== */

  analysisCard: {
    ...card,
    padding: 16,
    marginBottom: 12,
  },

  cardHeadingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 17,
  },

  headingContent: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  analysisTitle: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
    color: colors.ink,
  },

  cardSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slateSoft,
    marginTop: 3,
  },

  analysisIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor:
      colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
  },

  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  analysisStat: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },

  analysisTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    minHeight: 17,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },

  analysisLabel: {
    fontSize: 10,
    lineHeight: 14,
    color: colors.slate,
    fontWeight: "600",
  },

  analysisValue: {
    fontSize: 22,
    lineHeight: 27,
    fontWeight: "800",
    color: colors.ink,
  },

  /* =====================================================
     INSIGHT
  ===================================================== */

  insightCard: {
    ...card,
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    marginBottom: 12,
  },

  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  insightContent: {
    flex: 1,
    minWidth: 0,
  },

  insightTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: colors.ink,
  },

  insightText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
    marginTop: 3,
  },

  /* =====================================================
     SOLUTIONS BUTTON
  ===================================================== */

  solutionsButton: {
    minHeight: 62,
    borderRadius: radius.lg,
    backgroundColor:
      colors.ink2,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 24,
    ...shadow.sm,
  },

  solutionButtonIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor:
      "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  solutionButtonContent: {
    flex: 1,
    minWidth: 0,
  },

  solutionsButtonText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  solutionsButtonSub: {
    color:
      "rgba(255,255,255,0.62)",
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 2,
  },

  /* =====================================================
     SECTION HEADER
  ===================================================== */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13,
  },

  sectionHeaderText: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    color: colors.ink,
  },

  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slateSoft,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 31,
    height: 31,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor:
      colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  countBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.danger,
  },

  /* =====================================================
     ALL CORRECT
  ===================================================== */

  allCorrectBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      colors.successLight,
    borderRadius: radius.lg,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor:
      colors.successBorder,
  },

  allCorrectIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor:
      colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  allCorrectContent: {
    flex: 1,
    minWidth: 0,
  },

  allCorrectTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
    color: colors.success,
  },

  allCorrectText: {
    fontSize: 11,
    lineHeight: 17,
    color: colors.slate,
    marginTop: 2,
  },

  /* =====================================================
     WRONG CARD
  ===================================================== */

  wrongCard: {
    ...card,
    padding: 15,
    marginBottom: 11,
    borderLeftWidth: 3,
    borderLeftColor:
      colors.danger,
  },

  questionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  questionNumber: {
    minWidth: 31,
    height: 29,
    paddingHorizontal: 7,
    borderRadius: 9,
    backgroundColor:
      colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  questionNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: colors.danger,
  },

  wrongQuestion: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "700",
    color: colors.ink,
  },

  /* =====================================================
     ANSWERS
  ===================================================== */

  answerBox: {
    backgroundColor:
      colors.bg,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 13,
  },

  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  answerContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: 7,
  },

  answerLabel: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.slateSoft,
    fontWeight: "600",
    marginBottom: 2,
  },

  wrongAnswerText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.danger,
  },

  correctAnswerText: {
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "700",
    color: colors.success,
  },

  answerDivider: {
    height: 1,
    backgroundColor:
      colors.border,
    marginVertical: 10,
  },

  /* =====================================================
     SOLUTION
  ===================================================== */

  solutionBox: {
    backgroundColor:
      colors.brandTint,
    borderRadius: radius.md,
    padding: 13,
    marginTop: 11,
    borderWidth: 1,
    borderColor:
      colors.brandLight,
  },

  solutionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  solutionIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor:
      colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  solutionLabel: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 0.7,
    marginLeft: 6,
  },

  solutionLanguage: {
    marginLeft: "auto",
    fontSize: 9,
    lineHeight: 13,
    color: colors.brand,
    fontWeight: "700",
  },

  solutionText: {
    fontSize: 12.5,
    lineHeight: 20,
    color: colors.inkSoft,
  },

  /* =====================================================
     ACTIONS
  ===================================================== */

  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: radius.md,
    backgroundColor:
      colors.brand,
    marginTop: spacing.md,
    ...shadow.brand,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "800",
  },

  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    paddingVertical: spacing.sm,
  },

  secondaryButtonText: {
    color: colors.slate,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
});