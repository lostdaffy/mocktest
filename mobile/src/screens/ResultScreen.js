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
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  gradients,
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

function getTestLanguage(attempt, question) {
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

function getLocalizedText(
  question,
  language
) {
  if (!question) return "";

  const lang =
    normalizeLanguage(language);

  if (
    lang === "hi" &&
    typeof question.textHi ===
      "string" &&
    question.textHi.trim()
  ) {
    return question.textHi;
  }

  return question.text || "";
}

function getLocalizedOptions(
  question,
  language
) {
  if (!question) return [];

  const lang =
    normalizeLanguage(language);

  if (
    lang === "hi" &&
    Array.isArray(
      question.optionsHi
    ) &&
    question.optionsHi.length ===
      question.options?.length
  ) {
    return question.optionsHi;
  }

  return question.options || [];
}

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

  /* OBJECT */

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

  /* ARRAY */

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

  /* EXPLICIT LANGUAGE FIELDS */

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
      <View style={styles.centered}>
        <View
          style={styles.loaderCircle}
        >
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>

        <Text
          style={styles.loadingTitle}
        >
          Preparing your result
        </Text>

        <Text
          style={styles.loadingText}
        >
          Please wait a moment...
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

  const performanceSub =
    pct >= 80
      ? "You're showing strong command of the test."
      : pct >= 60
      ? "You're on the right track. Keep practicing."
      : pct >= 40
      ? "A little more focused practice can lift your score."
      : "Review your mistakes and practice consistently.";

  const performanceIcon =
    pct >= 80
      ? "trophy"
      : pct >= 60
      ? "trending-up"
      : pct >= 40
      ? "fitness"
      : "refresh";

  const correctCount =
    attempt.correctCount || 0;

  const wrongCount =
    attempt.wrongCount || 0;

  const skippedCount =
    attempt.skippedCount || 0;

  function scrollToMistakes() {
    scrollRef.current?.scrollTo({
      y: Math.max(
        mistakesY.current - 14,
        0
      ),
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
            insets.top + 10,
            18
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
          TOP BAR
      ================================================= */}

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.topButton}
          activeOpacity={0.75}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={19}
            color={colors.ink}
          />
        </TouchableOpacity>

        <View
          style={styles.topTitleWrap}
        >
          <Text
            style={styles.topTitle}
          >
            Test Result
          </Text>

          <Text
            style={styles.topSubtitle}
          >
            Performance summary
          </Text>
        </View>

        <TouchableOpacity
          style={styles.topButton}
          activeOpacity={0.75}
          onPress={load}
        >
          <Ionicons
            name="refresh-outline"
            size={18}
            color={colors.slate}
          />
        </TouchableOpacity>
      </View>

      {/* =================================================
          TEST IDENTITY
      ================================================= */}

      <View style={styles.testCard}>
        <View style={styles.testIcon}>
          <Ionicons
            name="document-text"
            size={19}
            color={colors.brand}
          />
        </View>

        <View style={styles.testInfo}>
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
            <Ionicons
              name="calendar-outline"
              size={11}
              color={colors.slateSoft}
            />

            <Text
              style={styles.testDate}
            >
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
                styles.metaDot
              }
            />

            <View
              style={
                styles.languageBadge
              }
            >
              <Ionicons
                name="language-outline"
                size={10}
                color={colors.brand}
              />

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
        style={[
          styles.scoreHero,
          {
            borderColor:
              scoreColor + "22",
          },
        ]}
      >
        <View
          style={[
            styles.scoreGlow,
            {
              backgroundColor:
                scoreColor + "0D",
            },
          ]}
        />

        <View
          style={styles.resultBadge}
        >
          <Ionicons
            name={performanceIcon}
            size={12}
            color={scoreColor}
          />

          <Text
            style={[
              styles.resultBadgeText,
              {
                color: scoreColor,
              },
            ]}
          >
            TEST RESULT
          </Text>
        </View>

        <Text
          style={styles.performanceText}
          numberOfLines={2}
        >
          {performanceText}
        </Text>

        <Text
          style={styles.performanceSub}
          numberOfLines={2}
        >
          {performanceSub}
        </Text>

        {/* SCORE */}

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

        {/* PROGRESS */}

        <View
          style={styles.progressTrack}
        >
          <View
            style={[
              styles.progressFill,
              {
                width: `${safePct}%`,
                backgroundColor:
                  scoreColor,
              },
            ]}
          />
        </View>

        {/* META */}

        <View
          style={styles.metaRow}
        >
          <ScoreMeta
            icon="checkmark-circle"
            value={correctCount}
            label="Correct"
            color={colors.success}
          />

          <View
            style={styles.metaDivider}
          />

          <ScoreMeta
            icon="close-circle"
            value={wrongCount}
            label="Incorrect"
            color={colors.danger}
          />

          <View
            style={styles.metaDivider}
          />

          <ScoreMeta
            icon="remove-circle"
            value={skippedCount}
            label="Skipped"
            color={colors.slate}
          />
        </View>
      </View>

      {/* =================================================
          RANK CARD
      ================================================= */}

      <View
        style={styles.rankCard}
      >
        <View
          style={styles.rankIcon}
        >
          <Ionicons
            name="podium-outline"
            size={18}
            color={colors.brand}
          />
        </View>

        <View
          style={styles.rankContent}
        >
          <Text
            style={styles.rankLabel}
          >
            YOUR RANK
          </Text>

          <Text
            style={styles.rankValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {attempt.rank ||
              "—"}
          </Text>

          {attempt.totalParticipants ? (
            <Text
              style={styles.rankSub}
            >
              Out of{" "}
              {attempt.totalParticipants}{" "}
              participants
            </Text>
          ) : (
            <Text
              style={styles.rankSub}
            >
              Rank will appear here
            </Text>
          )}
        </View>

        <View
          style={styles.rankArrow}
        >
          <Ionicons
            name="trending-up"
            size={16}
            color={colors.brand}
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
          style={styles.cardHeadingRow}
        >
          <View
            style={styles.headingContent}
          >
            <Text
              style={styles.analysisTitle}
            >
              Performance Analysis
            </Text>

            <Text
              style={styles.cardSubtitle}
            >
              Your question-wise performance
            </Text>
          </View>

          <View
            style={styles.analysisIcon}
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
            icon="checkmark-circle"
            color={colors.success}
            value={correctCount}
            label="Correct"
          />

          <AnalysisStat
            icon="close-circle"
            color={colors.danger}
            value={wrongCount}
            label="Incorrect"
          />

          <AnalysisStat
            icon="remove-circle"
            color={colors.slateSoft}
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
            style={styles.insightContent}
          >
            <View
              style={
                styles.insightTitleRow
              }
            >
              <Text
                style={styles.insightTitle}
              >
                Smart Insight
              </Text>

              <View
                style={
                  styles.insightTag
                }
              >
                <Text
                  style={
                    styles.insightTagText
                  }
                >
                  TIP
                </Text>
              </View>
            </View>

            <Text
              style={styles.insightText}
            >
              {insight.note}
            </Text>
          </View>
        </View>
      ) : null}

      {/* =================================================
          SOLUTIONS CTA
      ================================================= */}

      <TouchableOpacity
        style={styles.solutionsButton}
        activeOpacity={0.88}
        onPress={scrollToMistakes}
      >
        <LinearGradient
          colors={
            gradients.brand
          }
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={
            styles.solutionGradient
          }
        >
          <View
            style={
              styles.solutionButtonIcon
            }
          >
            <Ionicons
              name="document-text-outline"
              size={18}
              color="#FFFFFF"
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
              Review Solutions
            </Text>

            <Text
              style={
                styles.solutionsButtonSub
              }
            >
              See answers, mistakes and explanations
            </Text>
          </View>

          <View
            style={
              styles.solutionArrow
            }
          >
            <Ionicons
              name="arrow-down"
              size={16}
              color="#FFFFFF"
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* =================================================
          MISTAKES HEADER
      ================================================= */}

      <View
        style={styles.sectionHeader}
        onLayout={(e) => {
          mistakesY.current =
            e.nativeEvent.layout.y;
        }}
      >
        <View
          style={styles.sectionHeaderText}
        >
          <View
            style={
              styles.sectionTitleRow
            }
          >
            <Text
              style={styles.sectionTitle}
            >
              Learn from mistakes
            </Text>

            {wrongAnswers.length >
              0 && (
              <View
                style={
                  styles.mistakePill
                }
              >
                <Text
                  style={
                    styles.mistakePillText
                  }
                >
                  REVIEW
                </Text>
              </View>
            )}
          </View>

          <Text
            style={styles.sectionSubtitle}
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
          style={styles.allCorrectBox}
        >
          <View
            style={styles.allCorrectIcon}
          >
            <Ionicons
              name="checkmark"
              size={22}
              color={colors.success}
            />
          </View>

          <View
            style={styles.allCorrectContent}
          >
            <Text
              style={styles.allCorrectTitle}
            >
              Perfect attempt
            </Text>

            <Text
              style={styles.allCorrectText}
            >
              Outstanding work — all
              attempted questions were
              correct.
            </Text>
          </View>

          <Ionicons
            name="sparkles"
            size={18}
            color={colors.success}
          />
        </View>
      ) : (
        wrongAnswers.map(
          (answer, idx) => (
            <WrongAnswerCard
              key={
                answer._id ||
                answer.question?._id ||
                idx
              }
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
        style={styles.primaryButton}
        activeOpacity={0.88}
        onPress={() =>
          navigation.navigate(
            "Analysis"
          )
        }
      >
        <LinearGradient
          colors={
            gradients.brand
          }
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 0,
          }}
          style={
            styles.primaryGradient
          }
        >
          <Ionicons
            name="stats-chart"
            size={18}
            color="#FFFFFF"
          />

          <Text
            style={
              styles.primaryButtonText
            }
          >
            View Full Analysis
          </Text>

          <Ionicons
            name="arrow-forward"
            size={17}
            color="#FFFFFF"
          />
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate(
            "Home"
          )
        }
      >
        <Ionicons
          name="home-outline"
          size={15}
          color={colors.slate}
        />

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
  icon,
  value,
  label,
  color,
}) {
  return (
    <View
      style={styles.metaItem}
    >
      <View
        style={[
          styles.metaIcon,
          {
            backgroundColor:
              color + "12",
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={13}
          color={color}
        />
      </View>

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
  icon,
  color,
  value,
  label,
}) {
  return (
    <View
      style={styles.analysisStat}
    >
      <View
        style={[
          styles.analysisIconSmall,
          {
            backgroundColor:
              color + "12",
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={14}
          color={color}
        />
      </View>

      <Text
        style={styles.analysisValue}
      >
        {value}
      </Text>

      <Text
        style={styles.analysisLabel}
        numberOfLines={1}
      >
        {label}
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

  const localizedText =
    getLocalizedText(
      question,
      language
    );

  const localizedOptions =
    getLocalizedOptions(
      question,
      language
    );

  const selectedAnswer =
    localizedOptions?.[
      answer.selectedIndex
    ];

  const correctAnswer =
    localizedOptions?.[
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
      {/* HEADER */}

      <View
        style={styles.wrongHeader}
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

        <View
          style={styles.wrongHeaderText}
        >
          <Text
            style={styles.wrongHeaderLabel}
          >
            Incorrect answer
          </Text>

          <View
            style={styles.questionStatus}
          >
            <Ionicons
              name="close-circle"
              size={11}
              color={colors.danger}
            />

            <Text
              style={
                styles.questionStatusText
              }
            >
              Needs review
            </Text>
          </View>
        </View>
      </View>

      {/* QUESTION */}

      <Text
        style={styles.wrongQuestion}
      >
        {localizedText}
      </Text>

      {/* ANSWERS */}

      <View
        style={styles.answerBox}
      >
        <View
          style={styles.answerRow}
        >
          <View
            style={[
              styles.answerIcon,
              {
                backgroundColor:
                  colors.dangerLight,
              },
            ]}
          >
            <Ionicons
              name="close"
              size={13}
              color={colors.danger}
            />
          </View>

          <View
            style={styles.answerContent}
          >
            <Text
              style={styles.answerLabel}
            >
              YOUR ANSWER
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
          <View
            style={[
              styles.answerIcon,
              {
                backgroundColor:
                  colors.successLight,
              },
            ]}
          >
            <Ionicons
              name="checkmark"
              size={13}
              color={colors.success}
            />
          </View>

          <View
            style={styles.answerContent}
          >
            <Text
              style={styles.answerLabel}
            >
              CORRECT ANSWER
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

            <View
              style={
                styles.solutionTitleWrap
              }
            >
              <Text
                style={
                  styles.solutionLabel
                }
              >
                SOLUTION
              </Text>

              <Text
                style={
                  styles.solutionSubLabel
                }
              >
                Explanation
              </Text>
            </View>

            <View
              style={
                styles.solutionLanguage
              }
            >
              <Ionicons
                name="language-outline"
                size={10}
                color={colors.brand}
              />

              <Text
                style={
                  styles.solutionLanguageText
                }
              >
                {language === "hi"
                  ? "हिंदी"
                  : "English"}
              </Text>
            </View>
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

    contentContainer: {
      paddingHorizontal:
        spacing.lg,
    },

    centered: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.bg,
    },

    loaderCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        colors.surface,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.soft,
    },

    loadingTitle: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "800",
      color: colors.ink,
      marginTop: 13,
    },

    loadingText: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.slateSoft,
      fontWeight: "500",
      marginTop: 3,
    },

    /* =====================================================
       TOP BAR
    ===================================================== */

    topBar: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    topButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems: "center",
      justifyContent: "center",
      ...shadow.soft,
    },

    topTitleWrap: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      paddingHorizontal: 10,
    },

    topTitle: {
      fontSize: 16,
      lineHeight: 21,
      fontWeight: "800",
      color: colors.ink,
    },

    topSubtitle: {
      fontSize: 9.5,
      lineHeight: 14,
      color: colors.slateSoft,
      marginTop: 1,
      fontWeight: "500",
    },

    /* =====================================================
       TEST CARD
    ===================================================== */

    testCard: {
      ...card,
      flexDirection: "row",
      alignItems: "center",
      padding: 13,
      marginBottom: 12,
    },

    testIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 11,
    },

    testInfo: {
      flex: 1,
      minWidth: 0,
    },

    testTitle: {
      fontSize: 15,
      lineHeight: 20,
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
      fontSize: 10,
      lineHeight: 14,
      color: colors.slateSoft,
      fontWeight: "600",
      marginLeft: 4,
    },

    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        colors.border,
      marginHorizontal: 7,
    },

    languageBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor:
        colors.brandTint,
    },

    languageBadgeText: {
      fontSize: 8.5,
      lineHeight: 12,
      color: colors.brand,
      fontWeight: "800",
    },

    /* =====================================================
       SCORE HERO
    ===================================================== */

    scoreHero: {
      position: "relative",
      overflow: "hidden",
      backgroundColor:
        colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 15,
      marginBottom: 12,
      alignItems: "center",
      ...shadow.soft,
    },

    scoreGlow: {
      position: "absolute",
      width: 190,
      height: 190,
      borderRadius: 95,
      top: -120,
      right: -55,
    },

    resultBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.brandTint,
    },

    resultBadgeText: {
      fontSize: 8,
      lineHeight: 12,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    performanceText: {
      fontSize: 21,
      lineHeight: 27,
      fontWeight: "900",
      color: colors.ink,
      textAlign: "center",
      marginTop: 9,
    },

    performanceSub: {
      fontSize: 10.5,
      lineHeight: 16,
      fontWeight: "500",
      color: colors.slate,
      textAlign: "center",
      maxWidth: 280,
      marginTop: 3,
    },

    scoreBlock: {
      alignItems: "center",
      justifyContent: "center",
      marginTop: 12,
    },

    scorePercentage: {
      fontSize: 54,
      lineHeight: 61,
      fontWeight: "900",
      letterSpacing: -2.2,
    },

    scoreLine: {
      flexDirection: "row",
      alignItems: "baseline",
      justifyContent: "center",
      marginTop: -1,
    },

    scoreNumber: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: "800",
      color: colors.ink,
    },

    scoreTotal: {
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "600",
      color: colors.slateSoft,
      marginLeft: 3,
    },

    scoreLabel: {
      fontSize: 8,
      lineHeight: 12,
      fontWeight: "900",
      color: colors.slateSoft,
      letterSpacing: 1.2,
      marginTop: 3,
    },

    progressTrack: {
      width: "100%",
      height: 6,
      borderRadius: 3,
      backgroundColor:
        colors.slateLight,
      overflow: "hidden",
      marginTop: 14,
    },

    progressFill: {
      height: "100%",
      borderRadius: 3,
    },

    metaRow: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
    },

    metaItem: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      justifyContent: "center",
    },

    metaIcon: {
      width: 25,
      height: 25,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4,
    },

    metaValue: {
      fontSize: 17,
      lineHeight: 22,
      fontWeight: "900",
      color: colors.ink,
    },

    metaLabel: {
      fontSize: 8.5,
      lineHeight: 12,
      color: colors.slateSoft,
      fontWeight: "600",
      marginTop: 1,
      textAlign: "center",
    },

    metaDivider: {
      width: 1,
      height: 45,
      backgroundColor:
        colors.border,
    },

    /* =====================================================
       RANK
    ===================================================== */

    rankCard: {
      ...card,
      minHeight: 72,
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
      marginBottom: 12,
    },

    rankIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    rankContent: {
      flex: 1,
      minWidth: 0,
    },

    rankLabel: {
      fontSize: 8,
      lineHeight: 11,
      color: colors.slateSoft,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    rankValue: {
      fontSize: 19,
      lineHeight: 24,
      color: colors.ink,
      fontWeight: "900",
      marginTop: 1,
    },

    rankSub: {
      fontSize: 9.5,
      lineHeight: 14,
      color: colors.slate,
      fontWeight: "500",
      marginTop: 1,
    },

    rankArrow: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent: "center",
    },

    /* =====================================================
       ANALYSIS
    ===================================================== */

    analysisCard: {
      ...card,
      padding: 15,
      marginBottom: 12,
    },

    cardHeadingRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      marginBottom: 16,
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
      fontSize: 10,
      lineHeight: 15,
      color: colors.slateSoft,
      marginTop: 3,
    },

    analysisIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent: "center",
    },

    analysisRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
    },

    analysisStat: {
      flex: 1,
      alignItems: "center",
      minWidth: 0,
    },

    analysisIconSmall: {
      width: 29,
      height: 29,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 5,
    },

    analysisValue: {
      fontSize: 21,
      lineHeight: 26,
      fontWeight: "900",
      color: colors.ink,
    },

    analysisLabel: {
      fontSize: 9,
      lineHeight: 13,
      color: colors.slate,
      fontWeight: "600",
      marginTop: 1,
      textAlign: "center",
    },

    /* =====================================================
       INSIGHT
    ===================================================== */

    insightCard: {
      ...card,
      flexDirection: "row",
      alignItems: "flex-start",
      padding: 14,
      marginBottom: 12,
      backgroundColor:
        colors.surface,
    },

    insightIcon: {
      width: 37,
      height: 37,
      borderRadius: 12,
      backgroundColor:
        colors.brandTint,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    insightContent: {
      flex: 1,
      minWidth: 0,
    },

    insightTitleRow: {
      flexDirection: "row",
      alignItems: "center",
    },

    insightTitle: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
    },

    insightTag: {
      marginLeft: 7,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor:
        colors.brandTint,
    },

    insightTagText: {
      fontSize: 6.5,
      lineHeight: 9,
      fontWeight: "900",
      color: colors.brand,
      letterSpacing: 0.4,
    },

    insightText: {
      fontSize: 11,
      lineHeight: 17,
      color: colors.slate,
      marginTop: 4,
    },

    /* =====================================================
       SOLUTIONS CTA
    ===================================================== */

    solutionsButton: {
      minHeight: 70,
      borderRadius: 18,
      overflow: "hidden",
      marginBottom: 24,
      ...shadow.brand,
    },

    solutionGradient: {
      flex: 1,
      minHeight: 70,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 13,
    },

    solutionButtonIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "rgba(255,255,255,0.15)",
      borderWidth: 1,
      borderColor:
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
      color: "#FFFFFF",
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "900",
    },

    solutionsButtonSub: {
      color:
        "rgba(255,255,255,0.72)",
      fontSize: 9.5,
      lineHeight: 14,
      marginTop: 2,
      fontWeight: "500",
    },

    solutionArrow: {
      width: 31,
      height: 31,
      borderRadius: 11,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 8,
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 12,
    },

    sectionHeaderText: {
      flex: 1,
      minWidth: 0,
    },

    sectionTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },

    sectionTitle: {
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "900",
      color: colors.ink,
    },

    sectionSubtitle: {
      fontSize: 10,
      lineHeight: 15,
      color: colors.slateSoft,
      marginTop: 2,
    },

    mistakePill: {
      marginLeft: 7,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 5,
      backgroundColor:
        colors.dangerLight,
    },

    mistakePillText: {
      fontSize: 6.5,
      lineHeight: 9,
      color: colors.danger,
      fontWeight: "900",
      letterSpacing: 0.4,
    },

    countBadge: {
      minWidth: 32,
      height: 32,
      paddingHorizontal: 8,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.dangerLight,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
    },

    countBadgeText: {
      fontSize: 12,
      fontWeight: "900",
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
      borderRadius: 17,
      padding: 14,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        colors.successBorder,
    },

    allCorrectIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        colors.surface,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },

    allCorrectContent: {
      flex: 1,
      minWidth: 0,
    },

    allCorrectTitle: {
      fontSize: 14,
      lineHeight: 19,
      fontWeight: "900",
      color: colors.success,
    },

    allCorrectText: {
      fontSize: 10.5,
      lineHeight: 17,
      color: colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       WRONG CARD
    ===================================================== */

    wrongCard: {
      ...card,
      padding: 14,
      marginBottom: 11,
      borderLeftWidth: 3,
      borderLeftColor:
        colors.danger,
    },

    wrongHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },

    questionNumber: {
      minWidth: 38,
      height: 29,
      paddingHorizontal: 8,
      borderRadius: 9,
      backgroundColor:
        colors.dangerLight,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 9,
    },

    questionNumberText: {
      fontSize: 9.5,
      fontWeight: "900",
      color: colors.danger,
    },

    wrongHeaderText: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },

    wrongHeaderLabel: {
      fontSize: 10,
      lineHeight: 14,
      color: colors.slateSoft,
      fontWeight: "700",
    },

    questionStatus: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginLeft: 7,
    },

    questionStatusText: {
      fontSize: 8,
      lineHeight: 12,
      color: colors.danger,
      fontWeight: "700",
    },

    wrongQuestion: {
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
      borderRadius: 13,
      padding: 11,
      marginTop: 12,
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    answerRow: {
      flexDirection: "row",
      alignItems: "flex-start",
    },

    answerIcon: {
      width: 27,
      height: 27,
      borderRadius: 9,
      alignItems: "center",
      justifyContent: "center",
    },

    answerContent: {
      flex: 1,
      minWidth: 0,
      marginLeft: 8,
    },

    answerLabel: {
      fontSize: 8,
      lineHeight: 12,
      color: colors.slateSoft,
      fontWeight: "900",
      letterSpacing: 0.4,
      marginBottom: 2,
    },

    wrongAnswerText: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.danger,
    },

    correctAnswerText: {
      fontSize: 12,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.success,
    },

    answerDivider: {
      height: 1,
      backgroundColor:
        colors.border,
      marginVertical: 9,
    },

    /* =====================================================
       SOLUTION
    ===================================================== */

    solutionBox: {
      backgroundColor:
        colors.brandTint,
      borderRadius: 13,
      padding: 12,
      marginTop: 10,
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
      width: 26,
      height: 26,
      borderRadius: 8,
      backgroundColor:
        colors.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    solutionTitleWrap: {
      marginLeft: 7,
    },

    solutionLabel: {
      fontSize: 8,
      lineHeight: 11,
      fontWeight: "900",
      color: colors.brand,
      letterSpacing: 0.7,
    },

    solutionSubLabel: {
      fontSize: 7.5,
      lineHeight: 10,
      color: colors.slateSoft,
      marginTop: 1,
    },

    solutionLanguage: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      marginLeft: "auto",
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 7,
      backgroundColor:
        colors.surface,
    },

    solutionLanguageText: {
      fontSize: 8,
      lineHeight: 11,
      color: colors.brand,
      fontWeight: "800",
    },

    solutionText: {
      fontSize: 12,
      lineHeight: 20,
      color: colors.inkSoft,
      fontWeight: "500",
    },

    /* =====================================================
       ACTIONS
    ===================================================== */

    primaryButton: {
      height: 54,
      borderRadius: 16,
      overflow: "hidden",
      marginTop: spacing.md,
      ...shadow.brand,
    },

    primaryGradient: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },

    primaryButtonText: {
      color: "#FFFFFF",
      fontSize: 13.5,
      lineHeight: 19,
      fontWeight: "900",
    },

    secondaryButton: {
      minHeight: 50,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: spacing.sm,
    },

    secondaryButtonText: {
      color: colors.slate,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: "700",
    },
  });