import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  spacing,
  radius,
  type,
  card,
  shadow,
} from "../theme/theme";

/* =========================================================
   HISTORY SCREEN
========================================================= */

export default function HistoryScreen({
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const [history, setHistory] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     LOAD HISTORY
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            "/tests/my-attempts"
          );

        setHistory(
          res.data?.attempts || []
        );
      } catch (err) {
        console.log(
          "History loading error:",
          err
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     SUMMARY
  ======================================================= */

  const summary =
    useMemo(() => {
      if (!history.length) {
        return {
          total: 0,
          average: 0,
          best: 0,
        };
      }

      const percentages =
        history.map((item) => {
          if (
            !item.totalMarks ||
            item.totalMarks <= 0
          ) {
            return 0;
          }

          return Math.round(
            (item.score /
              item.totalMarks) *
              100
          );
        });

      const average =
        Math.round(
          percentages.reduce(
            (sum, value) =>
              sum + value,
            0
          ) /
            percentages.length
        );

      const best =
        Math.max(
          ...percentages
        );

      return {
        total: history.length,
        average,
        best,
      };
    }, [history]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <View
          style={
            styles.loaderCircle
          }
        >
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>

        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading history
        </Text>

        <Text
          style={
            styles.loadingText
          }
        >
          Fetching your test attempts...
        </Text>
      </View>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View
      style={styles.container}
    >
      <FlatList
        data={history}
        keyExtractor={(item) =>
          String(
            item.attemptId
          )
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              spacing.xxl +
              insets.bottom,
          },
        ]}
        ListHeaderComponent={
          history.length > 0 ? (
            <>
              {/* ===========================================
                  HEADER
              =========================================== */}

              <View
                style={
                  styles.header
                }
              >
                <View
                  style={
                    styles.headerTextWrap
                  }
                >
                  <Text
                    style={
                      styles.eyebrow
                    }
                  >
                    YOUR PROGRESS
                  </Text>

                  <Text
                    style={
                      styles.headerTitle
                    }
                  >
                    Test History
                  </Text>

                  <Text
                    style={
                      styles.headerSub
                    }
                  >
                    Review your attempts and
                    track your performance.
                  </Text>
                </View>

                <TouchableOpacity
                  style={
                    styles.refreshButton
                  }
                  activeOpacity={0.75}
                  onPress={load}
                >
                  <Ionicons
                    name="refresh-outline"
                    size={19}
                    color={
                      colors.slate
                    }
                  />
                </TouchableOpacity>
              </View>

              {/* ===========================================
                  SUMMARY
              =========================================== */}

              <View
                style={
                  styles.summaryCard
                }
              >
                <SummaryItem
                  icon="document-text-outline"
                  value={
                    summary.total
                  }
                  label="Attempts"
                  tint={
                    colors.brand
                  }
                />

                <View
                  style={
                    styles.summaryDivider
                  }
                />

                <SummaryItem
                  icon="analytics-outline"
                  value={`${summary.average}%`}
                  label="Average"
                  tint={
                    "#0891B2"
                  }
                />

                <View
                  style={
                    styles.summaryDivider
                  }
                />

                <SummaryItem
                  icon="trophy-outline"
                  value={`${summary.best}%`}
                  label="Best Score"
                  tint={
                    "#F59E0B"
                  }
                />
              </View>

              {/* ===========================================
                  SECTION
              =========================================== */}

              <View
                style={
                  styles.sectionHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Recent Attempts
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Tap any test to review
                    your result.
                  </Text>
                </View>

                <View
                  style={
                    styles.attemptCount
                  }
                >
                  <Text
                    style={
                      styles.attemptCountText
                    }
                  >
                    {history.length}
                  </Text>
                </View>
              </View>
            </>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            onPress={() =>
              navigation.goBack()
            }
          />
        }
        renderItem={({
          item,
          index,
        }) => (
          <HistoryCard
            item={item}
            index={index}
            onPress={() =>
              navigation.navigate(
                "Result",
                {
                  attemptId:
                    item.attemptId,
                }
              )
            }
          />
        )}
      />
    </View>
  );
}

/* =========================================================
   SUMMARY ITEM
========================================================= */

function SummaryItem({
  icon,
  value,
  label,
  tint,
}) {
  return (
    <View
      style={styles.summaryItem}
    >
      <View
        style={[
          styles.summaryIcon,
          {
            backgroundColor:
              `${tint}12`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={16}
          color={tint}
        />
      </View>

      <Text
        style={[
          styles.summaryValue,
          {
            color: tint,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={
          styles.summaryLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   HISTORY CARD
========================================================= */

function HistoryCard({
  item,
  index,
  onPress,
}) {
  const pct =
    item.totalMarks > 0
      ? Math.round(
          (item.score /
            item.totalMarks) *
            100
        )
      : 0;

  const safePct = Math.max(
    0,
    Math.min(100, pct)
  );

  const result =
    getResultState(safePct);

  const date =
    item.date
      ? new Date(
          item.date
        ).toLocaleDateString(
          "en-IN",
          {
            day: "numeric",
            month: "short",
          }
        )
      : "—";

  return (
    <TouchableOpacity
      style={
        styles.historyCard
      }
      activeOpacity={0.82}
      onPress={onPress}
    >
      {/* TOP ROW */}

      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.cardNumber
          }
        >
          <Text
            style={
              styles.cardNumberText
            }
          >
            {String(
              index + 1
            ).padStart(2, "0")}
          </Text>
        </View>

        <View
          style={
            styles.cardTitleWrap
          }
        >
          <Text
            style={
              styles.title
            }
            numberOfLines={1}
          >
            {item.testTitle ||
              "Mock Test"}
          </Text>

          <View
            style={
              styles.dateRow
            }
          >
            <Ionicons
              name="calendar-outline"
              size={11}
              color={
                colors.slateSoft
              }
            />

            <Text
              style={
                styles.meta
              }
            >
              {date}
            </Text>
          </View>
        </View>

        {/* SCORE */}

        <View
          style={
            styles.scoreWrap
          }
        >
          <Text
            style={[
              styles.scoreValue,
              {
                color:
                  result.color,
              },
            ]}
          >
            {item.score}
          </Text>

          <Text
            style={
              styles.scoreOutOf
            }
          >
            / {item.totalMarks}
          </Text>
        </View>
      </View>

      {/* RESULT STATUS */}

      <View
        style={
          styles.statusRow
        }
      >
        <View
          style={[
            styles.statusTag,
            {
              backgroundColor:
                result.bg,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  result.color,
              },
            ]}
          />

          <Text
            style={[
              styles.statusText,
              {
                color:
                  result.color,
              },
            ]}
          >
            {result.label}
          </Text>
        </View>

        <Text
          style={
            styles.percentText
          }
        >
          {safePct}% score
        </Text>

        <View
          style={
            styles.reviewWrap
          }
        >
          <Text
            style={
              styles.reviewText
            }
          >
            Review
          </Text>

          <Ionicons
            name="chevron-forward"
            size={14}
            color={
              colors.slateSoft
            }
          />
        </View>
      </View>

      {/* PROGRESS */}

      <View
        style={
          styles.progressTrack
        }
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.max(
                safePct,
                1
              )}%`,
              backgroundColor:
                result.color,
            },
          ]}
        />
      </View>

      {/* ANSWERS */}

      <View
        style={
          styles.answerRow
        }
      >
        <AnswerStat
          icon="checkmark-circle"
          value={
            item.correctCount ??
            0
          }
          label="Correct"
          color={
            colors.success
          }
        />

        <View
          style={
            styles.answerDivider
          }
        />

        <AnswerStat
          icon="close-circle"
          value={
            item.wrongCount ??
            0
          }
          label="Wrong"
          color={
            colors.danger
          }
        />

        <View
          style={
            styles.answerDivider
          }
        />

        <AnswerStat
          icon="help-circle-outline"
          value={
            Math.max(
              0,
              (item.totalQuestions ||
                item.totalMarks ||
                0) -
                (item.correctCount ||
                  0) -
                (item.wrongCount ||
                  0)
            )
          }
          label="Skipped"
          color={
            colors.slate
          }
        />
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   ANSWER STAT
========================================================= */

function AnswerStat({
  icon,
  value,
  label,
  color,
}) {
  return (
    <View
      style={
        styles.answerStat
      }
    >
      <Ionicons
        name={icon}
        size={13}
        color={color}
      />

      <Text
        style={[
          styles.answerValue,
          {
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        style={
          styles.answerLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   RESULT STATE
========================================================= */

function getResultState(
  pct
) {
  if (pct >= 75) {
    return {
      label: "Excellent",
      color:
        colors.success,
      bg:
        colors.successLight,
    };
  }

  if (pct >= 60) {
    return {
      label: "Good",
      color:
        colors.brand,
      bg:
        colors.brandTint,
    };
  }

  if (pct >= 40) {
    return {
      label: "Needs Practice",
      color:
        colors.hard,
      bg:
        colors.warnLight,
    };
  }

  return {
    label: "Keep Practicing",
    color:
      colors.danger,
    bg:
      colors.dangerLight,
  };
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  onPress,
}) {
  return (
    <View
      style={styles.empty}
    >
      <View
        style={
          styles.emptyIllustration
        }
      >
        <View
          style={
            styles.emptyCircle
          }
        />

        <View
          style={
            styles.emptyDocument
          }
        >
          <Ionicons
            name="document-text-outline"
            size={27}
            color={
              colors.brand
            }
          />

          <View
            style={
              styles.emptyLine
            }
          />

          <View
            style={
              styles.emptyLineShort
            }
          />
        </View>

        <View
          style={
            styles.emptyClock
          }
        >
          <Ionicons
            name="time-outline"
            size={14}
            color="#F59E0B"
          />
        </View>
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No attempts yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Take your first mock test and
        your score, accuracy and
        progress will appear here.
      </Text>

      <TouchableOpacity
        style={
          styles.emptyButton
        }
        activeOpacity={0.82}
        onPress={onPress}
      >
        <Text
          style={
            styles.emptyButtonText
          }
        >
          Start Practicing
        </Text>

        <Ionicons
          name="arrow-forward"
          size={15}
          color="#FFFFFF"
        />
      </TouchableOpacity>
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

    listContent: {
      paddingHorizontal:
        spacing.lg,
      paddingTop: 18,
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
      marginBottom: 11,
      ...shadow.soft,
    },

    loadingTitle: {
      fontSize: 13,
      fontWeight:
        "800",
      color:
        colors.ink,
    },

    loadingText: {
      fontSize: 10,
      color:
        colors.slate,
      marginTop: 3,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 16,
    },

    headerTextWrap: {
      flex: 1,
      minWidth: 0,
    },

    eyebrow: {
      fontSize: 8,
      fontWeight:
        "800",
      letterSpacing:
        1,
      color:
        colors.brand,
      marginBottom: 3,
    },

    headerTitle: {
      ...type.h1,
      fontSize: 24,
      lineHeight: 29,
      color:
        colors.ink,
      fontWeight:
        "800",
      letterSpacing:
        -0.5,
    },

    headerSub: {
      ...type.small,
      fontSize: 10.5,
      lineHeight: 16,
      color:
        colors.slate,
      marginTop: 3,
    },

    refreshButton: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor:
        colors.surface,
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 12,
      ...shadow.soft,
    },

    /* =====================================================
       SUMMARY
    ===================================================== */

    summaryCard: {
      backgroundColor:
        colors.surface,
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        colors.border,
      minHeight: 88,
      paddingVertical: 12,
      paddingHorizontal: 8,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-around",
      marginBottom: 22,
      ...shadow.soft,
    },

    summaryItem: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    summaryIcon: {
      width: 28,
      height: 28,
      borderRadius: 9,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 4,
    },

    summaryValue: {
      fontSize: 16,
      lineHeight: 19,
      fontWeight:
        "800",
    },

    summaryLabel: {
      fontSize: 8.5,
      color:
        colors.slateSoft,
      fontWeight:
        "600",
      marginTop: 1,
    },

    summaryDivider: {
      width: 1,
      height: 37,
      backgroundColor:
        colors.border,
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 11,
    },

    sectionTitle: {
      fontSize: 18,
      fontWeight:
        "800",
      color:
        colors.ink,
      letterSpacing:
        -0.3,
    },

    sectionSubtitle: {
      fontSize: 10,
      color:
        colors.slate,
      marginTop: 2,
    },

    attemptCount: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor:
        colors.brandTint,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    attemptCountText: {
      fontSize: 12,
      fontWeight:
        "800",
      color:
        colors.brand,
    },

    /* =====================================================
       HISTORY CARD
    ===================================================== */

    historyCard: {
      backgroundColor:
        colors.surface,
      borderRadius: 19,
      padding: 13,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    cardTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    cardNumber: {
      width: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    cardNumberText: {
      fontSize: 9,
      fontWeight:
        "800",
      color:
        colors.slateSoft,
    },

    cardTitleWrap: {
      flex: 1,
      minWidth: 0,
    },

    title: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight:
        "800",
      color:
        colors.ink,
    },

    dateRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginTop: 3,
    },

    meta: {
      fontSize: 9,
      color:
        colors.slateSoft,
      fontWeight:
        "500",
    },

    scoreWrap: {
      alignItems:
        "flex-end",
      minWidth: 55,
      marginLeft: 8,
    },

    scoreValue: {
      fontSize: 22,
      lineHeight: 25,
      fontWeight:
        "800",
      letterSpacing:
        -0.5,
    },

    scoreOutOf: {
      fontSize: 8.5,
      color:
        colors.slateSoft,
      fontWeight:
        "600",
      marginTop: 1,
    },

    /* =====================================================
       STATUS
    ===================================================== */

    statusRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 12,
      marginBottom: 8,
    },

    statusTag: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius:
        radius.full,
    },

    statusDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    statusText: {
      fontSize: 8,
      fontWeight:
        "800",
    },

    percentText: {
      fontSize: 9,
      color:
        colors.slateSoft,
      fontWeight:
        "600",
      marginLeft: 7,
    },

    reviewWrap: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 2,
      marginLeft: "auto",
    },

    reviewText: {
      fontSize: 9,
      color:
        colors.slate,
      fontWeight:
        "700",
    },

    /* =====================================================
       PROGRESS
    ===================================================== */

    progressTrack: {
      width: "100%",
      height: 5,
      borderRadius: 4,
      overflow: "hidden",
      backgroundColor:
        colors.slateLight,
      marginBottom: 11,
    },

    progressFill: {
      height: "100%",
      borderRadius: 4,
    },

    /* =====================================================
       ANSWERS
    ===================================================== */

    answerRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingTop: 9,
      borderTopWidth: 1,
      borderTopColor:
        colors.border,
    },

    answerStat: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 4,
    },

    answerValue: {
      fontSize: 10,
      fontWeight:
        "800",
    },

    answerLabel: {
      fontSize: 8,
      color:
        colors.slateSoft,
      fontWeight:
        "600",
    },

    answerDivider: {
      width: 1,
      height: 16,
      backgroundColor:
        colors.border,
    },

    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      alignItems:
        "center",
      paddingTop: 65,
      paddingHorizontal: 25,
    },

    emptyIllustration: {
      width: 105,
      height: 90,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
      marginBottom: 14,
    },

    emptyCircle: {
      position:
        "absolute",
      width: 84,
      height: 84,
      borderRadius: 42,
      backgroundColor:
        colors.brandTint,
    },

    emptyDocument: {
      width: 52,
      height: 62,
      borderRadius: 11,
      backgroundColor:
        colors.surface,
      alignItems:
        "center",
      paddingTop: 10,
      ...shadow.soft,
    },

    emptyLine: {
      width: 27,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        colors.brandLight,
      marginTop: 7,
    },

    emptyLineShort: {
      width: 18,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        colors.slateLight,
      marginTop: 5,
    },

    emptyClock: {
      position:
        "absolute",
      right: 9,
      bottom: 7,
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        "#FFF8DF",
      borderWidth: 2,
      borderColor:
        colors.surface,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.soft,
    },

    emptyTitle: {
      fontSize: 18,
      lineHeight: 23,
      fontWeight:
        "800",
      color:
        colors.ink,
      marginBottom: 5,
    },

    emptyText: {
      fontSize: 11.5,
      lineHeight: 18,
      color:
        colors.slate,
      textAlign:
        "center",
      maxWidth: 285,
    },

    emptyButton: {
      height: 43,
      borderRadius: 13,
      backgroundColor:
        colors.brand,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
      paddingHorizontal: 17,
      marginTop: 18,
      ...shadow.brand,
    },

    emptyButtonText: {
      color: "#FFFFFF",
      fontSize: 11.5,
      fontWeight:
        "800",
    },
  });