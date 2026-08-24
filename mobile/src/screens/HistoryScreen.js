import {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
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

const PAGE_SIZE = 20;

const FILTERS = [
  { key: "all", label: "All", types: null },
  { key: "live", label: "Live", types: "live" },
  { key: "full_mock", label: "Mock", types: "full_mock" },
  { key: "pyq", label: "PYQ", types: "pyq" },
  { key: "practice", label: "Practice", types: "practice,topic_wise,sectional,revision" },
];

const TYPE_META = {
  live: { label: "Live", icon: "radio-button-on", color: colors.danger, bg: colors.dangerLight },
  full_mock: { label: "Mock", icon: "document-text-outline", color: colors.brand, bg: colors.brandTint },
  pyq: { label: "PYQ", icon: "time-outline", color: colors.warn, bg: colors.warnLight },
  practice: { label: "Practice", icon: "school-outline", color: colors.info, bg: colors.infoLight },
  topic_wise: { label: "Practice", icon: "school-outline", color: colors.info, bg: colors.infoLight },
  sectional: { label: "Practice", icon: "school-outline", color: colors.info, bg: colors.infoLight },
  revision: { label: "Practice", icon: "school-outline", color: colors.info, bg: colors.infoLight },
};

function getTypeMeta(t) {
  return TYPE_META[t] || TYPE_META.practice;
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const mins = Math.floor(totalSeconds / 60);
  if (mins < 1) return `${totalSeconds}s`;
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export default function HistoryScreen({
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState({ total: 0, average: 0, best: 0, trend: "flat" });
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /* =======================================================
     LOAD HISTORY
  ======================================================= */

  const load = useCallback(
    async (reset, filterOverride) => {
      const activeFilter = filterOverride ?? filter;
      const nextPage = reset ? 1 : page + 1;

      if (reset) setLoading(true);
      else setLoadingMore(true);

      try {
        const filterDef = FILTERS.find((f) => f.key === activeFilter);
        const res = await api.get("/tests/my-attempts", {
          params: {
            page: nextPage,
            limit: PAGE_SIZE,
            types: filterDef?.types || undefined,
          },
        });

        const rows = res.data?.history || [];
        setHistory((prev) => (reset ? rows : [...prev, ...rows]));
        setPage(res.data?.page || nextPage);
        setHasMore(!!res.data?.hasMore);
        if (res.data?.summary) setSummary(res.data.summary);
      } catch (err) {
        console.log(
          "History loading error:",
          err
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filter, page]
  );

  useFocusEffect(
    useCallback(() => {
      load(true, filter);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filter])
  );

  function selectFilter(key) {
    if (key === filter) return;
    setFilter(key);
    load(true, key);
  }

  function loadMore() {
    if (loading || loadingMore || !hasMore) return;
    load(false);
  }

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
        onEndReachedThreshold={0.4}
        onEndReached={loadMore}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom:
              spacing.xxl +
              insets.bottom,
          },
        ]}
        ListHeaderComponent={
          <>
            {/* ===========================================
                HEADER
            =========================================== */}

            <View
              style={
                styles.header
              }
            >
              <TouchableOpacity
                style={
                  styles.backButton
                }
                activeOpacity={0.75}
                hitSlop={8}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={22}
                  color={colors.ink}
                />
              </TouchableOpacity>

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

            </View>

            {/* ===========================================
                FILTER CHIPS
            =========================================== */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTERS.map((f) => {
                const active = filter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    activeOpacity={0.8}
                    onPress={() => selectFilter(f.key)}
                    style={[
                      styles.filterChip,
                      active && styles.filterChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        active && styles.filterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {summary.total > 0 && (
              <>
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
                    trend={summary.trend}
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
                      {summary.total}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </>
        }
        ListEmptyComponent={
          <EmptyState
            onPress={() =>
              navigation.goBack()
            }
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.brand} />
            </View>
          ) : null
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
  trend,
}) {
  const trendMeta =
    trend === "up"
      ? { icon: "trending-up", color: colors.success }
      : trend === "down"
      ? { icon: "trending-down", color: colors.danger }
      : null;

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

      <View style={styles.summaryValueRow}>
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

        {trendMeta && (
          <Ionicons
            name={trendMeta.icon}
            size={13}
            color={trendMeta.color}
            style={{ marginLeft: 2 }}
          />
        )}
      </View>

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

  const typeMeta = getTypeMeta(item.testType);

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

  const duration = formatDuration(item.totalTimeTakenSeconds);

  return (
    <TouchableOpacity
      style={
        styles.historyCard
      }
      activeOpacity={0.82}
      onPress={onPress}
    >
      {/* TYPE + RANK ROW */}

      <View style={styles.badgeRow}>
        <View
          style={[
            styles.typeBadge,
            { backgroundColor: typeMeta.bg },
          ]}
        >
          <Ionicons name={typeMeta.icon} size={10} color={typeMeta.color} />
          <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
            {typeMeta.label}
          </Text>
        </View>

        {item.testType === "live" && item.rank ? (
          <View style={styles.rankBadge}>
            <Ionicons name="ribbon-outline" size={10} color={colors.info} />
            <Text style={styles.rankBadgeText}>
              Rank #{item.rank}
              {item.percentile != null ? ` · ${item.percentile}th pct` : ""}
            </Text>
          </View>
        ) : null}

        {duration && (
          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={10} color={colors.slateSoft} />
            <Text style={styles.durationBadgeText}>{duration}</Text>
          </View>
        )}
      </View>

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
            item.skippedCount ??
            0
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

    backButton: {
      width: 38,
      height: 38,
      borderRadius: 14,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    /* =====================================================
       FILTER CHIPS
    ===================================================== */

    filterRow: {
      gap: 8,
      paddingBottom: 16,
    },

    filterChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },

    filterChipActive: {
      backgroundColor: colors.brand,
      borderColor: colors.brand,
    },

    filterChipText: {
      fontSize: 11.5,
      fontWeight: "700",
      color: colors.slate,
    },

    filterChipTextActive: {
      color: "#FFFFFF",
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

    summaryValueRow: {
      flexDirection: "row",
      alignItems: "center",
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

    badgeRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 9,
    },

    typeBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.full,
    },

    typeBadgeText: {
      fontSize: 8.5,
      fontWeight: "800",
    },

    rankBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.infoLight,
    },

    rankBadgeText: {
      fontSize: 8.5,
      fontWeight: "800",
      color: colors.info,
    },

    durationBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: radius.full,
      backgroundColor: colors.slateLight,
      marginLeft: "auto",
    },

    durationBadgeText: {
      fontSize: 8.5,
      fontWeight: "700",
      color: colors.slateSoft,
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
       FOOTER
    ===================================================== */

    footerLoader: {
      paddingVertical: 20,
      alignItems: "center",
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
