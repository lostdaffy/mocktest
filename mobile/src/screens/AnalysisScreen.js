import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useColorScheme,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "../context/AuthContext";

import {
  getColors,
  getCard,
  gradients,
  spacing,
  radius,
  type,
  shadow,
} from "../theme/theme";

import { useSafeAreaInsets } from "react-native-safe-area-context";

/* =========================================================
   ANALYSIS SCREEN
   Rankveer Design System
   Premium • Minimal • Responsive • Safe Area Ready
========================================================= */

export default function AnalysisScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  /* =======================================================
     THEME
  ======================================================= */

  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const colors = getColors(isDark);
  const topicCard = getCard(isDark);

  /* =======================================================
     DATA
  ======================================================= */

  const topicStats = user?.topicStats || [];

  const sorted = [...topicStats].sort(
    (a, b) =>
      Number(a.accuracy || 0) -
      Number(b.accuracy || 0)
  );

  const weak = sorted.filter(
    (topic) =>
      Number(topic.accuracy || 0) < 60
  );

  const strong = sorted.filter(
    (topic) =>
      Number(topic.accuracy || 0) >= 60
  );

  const overall =
    topicStats.length > 0
      ? Math.round(
        topicStats.reduce(
          (sum, topic) =>
            sum +
            Number(topic.accuracy || 0),
          0
        ) / topicStats.length
      )
      : 0;

  /* =======================================================
     PERFORMANCE
  ======================================================= */

  const getAccuracyStyle = (accuracy) => {
    if (accuracy >= 75) {
      return {
        tint: colors.success,
        background: colors.successLight,
        label: "Strong performance",
      };
    }

    if (accuracy >= 60) {
      return {
        tint: colors.medium,
        background: colors.mediumBg,
        label: "Good progress",
      };
    }

    if (accuracy >= 40) {
      return {
        tint: colors.hard,
        background: colors.hardBg,
        label: "Needs more practice",
      };
    }

    return {
      tint: colors.danger,
      background: colors.dangerLight,
      label: "Needs attention",
    };
  };

  const brandGradient =
    gradients.brand;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <FlatList
      style={[
        styles.container,
        {
          backgroundColor: colors.bg,
        },
      ]}
      data={sorted}
      keyExtractor={(item, index) =>
        `${item.subject}-${item.topic}-${index}`
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[
        styles.contentContainer,
        {
          paddingTop:
            Math.max(
              insets.top + spacing.sm,
              spacing.lg
            ),
          paddingBottom:
            spacing.xxl + insets.bottom,
        },
      ]}
      ListHeaderComponent={
        <View>

          {/* =================================================
              PAGE HEADER
          ================================================= */}

          <View style={styles.pageHeader}>
            <View
              style={[
                styles.headerIcon,
                {
                  backgroundColor:
                    colors.brandTint,
                  borderColor:
                    colors.brandLight,
                },
              ]}
            >
              <Ionicons
                name="analytics-outline"
                size={21}
                color={colors.brand}
              />
            </View>

            <View style={styles.headerCopy}>
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.ink,
                  },
                ]}
              >
                My Analysis
              </Text>

              <Text
                style={[
                  styles.subtitle,
                  {
                    color: colors.slate,
                  },
                ]}
                numberOfLines={2}
              >
                Track your performance and
                improve smarter.
              </Text>
            </View>
          </View>

          {/* =================================================
              OVERALL PERFORMANCE
          ================================================= */}

          {topicStats.length > 0 && (
            <>
              <LinearGradient
                colors={brandGradient}
                start={{
                  x: 0,
                  y: 0,
                }}
                end={{
                  x: 1,
                  y: 1,
                }}
                style={[
                  styles.overallCard,
                  {
                    shadowColor:
                      colors.brand,
                  },
                ]}
              >
                {/* DECORATIVE SHAPES */}

                <View
                  pointerEvents="none"
                  style={styles.glowOne}
                />

                <View
                  pointerEvents="none"
                  style={styles.glowTwo}
                />

                <View
                  pointerEvents="none"
                  style={styles.glowThree}
                />

                {/* MAIN SCORE */}

                <View
                  style={styles.overallMain}
                >
                  <View
                    style={styles.eyebrow}
                  >
                    <View
                      style={styles.eyebrowDot}
                    />

                    <Text
                      style={
                        styles.overallLabel
                      }
                    >
                      OVERALL ACCURACY
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.overallValue
                    }
                  >
                    {overall}%
                  </Text>

                  <Text
                    style={styles.overallSub}
                    numberOfLines={1}
                  >
                    Across {topicStats.length}{" "}
                    {topicStats.length === 1
                      ? "topic"
                      : "topics"}
                  </Text>
                </View>

                {/* STRONG / FOCUS */}

                <View
                  style={styles.splitBox}
                >
                  <View
                    style={styles.splitItem}
                  >
                    <View
                      style={styles.statIcon}
                    >
                      <Ionicons
                        name="trending-up"
                        size={14}
                        color="#FFFFFF"
                      />
                    </View>

                    <Text
                      style={
                        styles.splitValue
                      }
                    >
                      {strong.length}
                    </Text>

                    <Text
                      style={
                        styles.splitLabel
                      }
                    >
                      Strong
                    </Text>
                  </View>

                  <View
                    style={styles.splitDivider}
                  />

                  <View
                    style={styles.splitItem}
                  >
                    <View
                      style={styles.statIcon}
                    >
                      <Ionicons
                        name="flag-outline"
                        size={14}
                        color="#FFFFFF"
                      />
                    </View>

                    <Text
                      style={
                        styles.splitValue
                      }
                    >
                      {weak.length}
                    </Text>

                    <Text
                      style={
                        styles.splitLabel
                      }
                    >
                      Focus
                    </Text>
                  </View>
                </View>
              </LinearGradient>

              {/* =================================================
                  SMART TIP
              ================================================= */}

              {weak.length > 0 && (
                <View
                  style={[
                    styles.tipBox,
                    {
                      backgroundColor:
                        colors.warnLight,
                      borderColor:
                        colors.warnBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tipIcon,
                      {
                        backgroundColor:
                          colors.surface,
                        borderColor:
                          colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="bulb-outline"
                      size={17}
                      color={colors.warn}
                    />
                  </View>

                  <View
                    style={styles.tipCopy}
                  >
                    <Text
                      style={[
                        styles.tipTitle,
                        {
                          color:
                            colors.ink,
                        },
                      ]}
                    >
                      Smart focus
                    </Text>

                    <Text
                      style={[
                        styles.tipText,
                        {
                          color:
                            colors.inkSoft,
                        },
                      ]}
                    >
                      Focus on your{" "}
                      {weak.length === 1
                        ? "weakest topic"
                        : `${weak.length} weakest topics`}{" "}
                      first to improve your
                      score faster.
                    </Text>
                  </View>
                </View>
              )}

              {/* =================================================
                  TOPIC SECTION
              ================================================= */}

              <View
                style={
                  styles.sectionHeader
                }
              >
                <View
                  style={
                    styles.sectionCopy
                  }
                >
                  <Text
                    style={[
                      styles.sectionTitle,
                      {
                        color:
                          colors.ink,
                      },
                    ]}
                  >
                    Topic Performance
                  </Text>

                  <Text
                    style={[
                      styles.sectionSub,
                      {
                        color:
                          colors.slateSoft,
                      },
                    ]}
                  >
                    Weakest areas appear first
                  </Text>
                </View>

                <View
                  style={[
                    styles.topicCount,
                    {
                      backgroundColor:
                        colors.brandTint,
                      borderColor:
                        colors.brandLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.topicCountText,
                      {
                        color:
                          colors.brand,
                      },
                    ]}
                  >
                    {topicStats.length}
                  </Text>

                  <Text
                    style={[
                      styles.topicCountLabel,
                      {
                        color:
                          colors.slate,
                      },
                    ]}
                  >
                    topics
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        <View
          style={[
            styles.empty,
            {
              backgroundColor:
                colors.surface,
              borderColor:
                colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              {
                backgroundColor:
                  colors.brandTint,
                borderColor:
                  colors.brandLight,
              },
            ]}
          >
            <Ionicons
              name="stats-chart-outline"
              size={29}
              color={colors.brand}
            />
          </View>

          <Text
            style={[
              styles.emptyTitle,
              {
                color:
                  colors.ink,
              },
            ]}
          >
            No analysis yet
          </Text>

          <Text
            style={[
              styles.emptyText,
              {
                color:
                  colors.slate,
              },
            ]}
          >
            Take a few tests and your
            topic-wise performance will
            appear here.
          </Text>
        </View>
      }
      renderItem={({ item }) => {
        const accuracy = Math.max(
          0,
          Math.min(
            Number(
              item.accuracy || 0
            ),
            100
          )
        );

        const performance =
          getAccuracyStyle(
            accuracy
          );

        return (
          <View
            style={[
              topicCard,
              styles.topicCard,
            ]}
          >
            {/* TOP ROW */}

            <View
              style={styles.topicHeader}
            >
              <View
                style={styles.topicCopy}
              >
                <Text
                  style={[
                    styles.topic,
                    {
                      color:
                        colors.ink,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.topic ||
                    "Untitled topic"}
                </Text>

                <Text
                  style={[
                    styles.subject,
                    {
                      color:
                        colors.slateSoft,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.subject ||
                    "Subject"}{" "}
                  ·{" "}
                  {item.attempted ||
                    0}{" "}
                  attempted
                </Text>
              </View>

              {/* ACCURACY */}

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor:
                      performance.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        performance.tint,
                    },
                  ]}
                >
                  {accuracy}%
                </Text>
              </View>
            </View>

            {/* PROGRESS BAR */}

            <View
              style={[
                styles.barBg,
                {
                  backgroundColor:
                    colors.slateLight,
                },
              ]}
            >
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.max(
                      accuracy,
                      2
                    )}%`,
                    backgroundColor:
                      performance.tint,
                  },
                ]}
              />
            </View>

            {/* META */}

            <View
              style={
                styles.progressMeta
              }
            >
              <View
                style={styles.statusRow}
              >
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        performance.tint,
                    },
                  ]}
                />

                <Text
                  style={[
                    styles.progressLabel,
                    {
                      color:
                        colors.slate,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {performance.label}
                </Text>
              </View>

              <Text
                style={[
                  styles.progressValue,
                  {
                    color:
                      colors.slateSoft,
                  },
                ]}
              >
                {accuracy}% accuracy
              </Text>
            </View>
          </View>
        );
      }}
    />
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =====================================================
     CONTAINER
  ===================================================== */

  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal:
      spacing.lg,
  },

  /* =====================================================
     PAGE HEADER
  ===================================================== */

  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  title: {
    ...type.h1,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.5,
  },

  subtitle: {
    ...type.small,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 320,
  },

  /* =====================================================
     OVERALL CARD
  ===================================================== */

  overallCard: {
    minHeight: 150,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    paddingHorizontal: 16,
    paddingVertical: 17,
    marginBottom: 14,
    overflow: "hidden",
    ...shadow.brand,
  },

  glowOne: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -95,
    top: -105,
    backgroundColor:
      "rgba(255,255,255,0.09)",
  },

  glowTwo: {
    position: "absolute",
    width: 105,
    height: 105,
    borderRadius: 53,
    left: 50,
    bottom: -75,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  glowThree: {
    position: "absolute",
    width: 65,
    height: 65,
    borderRadius: 33,
    right: 100,
    bottom: -38,
    backgroundColor:
      "rgba(167,139,250,0.15)",
  },

  overallMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
    zIndex: 2,
  },

  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 3,
  },

  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor:
      "rgba(255,255,255,0.92)",
    marginRight: 6,
  },

  overallLabel: {
    ...type.micro,
    fontSize: 9,
    color:
      "rgba(255,255,255,0.76)",
    letterSpacing: 0.7,
  },

  overallValue: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -1,
  },

  overallSub: {
    fontSize: 11.5,
    lineHeight: 17,
    color:
      "rgba(255,255,255,0.78)",
    marginTop: 1,
  },

  /* =====================================================
     STRONG / FOCUS
  ===================================================== */

  splitBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor:
      "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.16)",
    borderRadius: 15,
    paddingVertical: 11,
    paddingHorizontal: 9,
    gap: 8,
    flexShrink: 0,
  },

  splitItem: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 40,
  },

  statIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    backgroundColor:
      "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },

  splitValue: {
    fontSize: 17,
    lineHeight: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  splitLabel: {
    fontSize: 9,
    lineHeight: 12,
    color:
      "rgba(255,255,255,0.72)",
    fontWeight: "600",
    marginTop: 1,
  },

  splitDivider: {
    width: 1,
    height: 48,
    backgroundColor:
      "rgba(255,255,255,0.18)",
  },

  /* =====================================================
     SMART TIP
  ===================================================== */

  tipBox: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.md,
    padding: 12,
    marginBottom: spacing.lg,
    borderWidth: 1,
  },

  tipIcon: {
    width: 35,
    height: 35,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  tipCopy: {
    flex: 1,
    minWidth: 0,
  },

  tipTitle: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "800",
    marginBottom: 1,
  },

  tipText: {
    ...type.small,
    fontSize: 11.5,
    lineHeight: 17,
  },

  /* =====================================================
     SECTION
  ===================================================== */

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 11,
  },

  sectionCopy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },

  sectionTitle: {
    ...type.h3,
    fontSize: 18,
    lineHeight: 23,
  },

  sectionSub: {
    ...type.tiny,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 2,
  },

  topicCount: {
    minWidth: 58,
    height: 31,
    paddingHorizontal: 9,
    borderRadius: radius.full,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    flexShrink: 0,
  },

  topicCountText: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "800",
  },

  topicCountLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
  },

  /* =====================================================
     TOPIC CARD
  ===================================================== */

  topicCard: {
    flexDirection: "column",
    alignItems: "stretch",
    padding: 14,
    marginBottom: 10,
    borderRadius: radius.lg,
  },

  topicHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  },

  topicCopy: {
    flex: 1,
    minWidth: 0,
  },

  topic: {
    ...type.bodyStrong,
    fontSize: 14,
    lineHeight: 19,
  },

  subject: {
    ...type.tiny,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "500",
    marginTop: 2,
  },

  /* =====================================================
     ACCURACY BADGE
  ===================================================== */

  badge: {
    minWidth: 55,
    height: 31,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  badgeText: {
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "800",
  },

  /* =====================================================
     PROGRESS
  ===================================================== */

  barBg: {
    width: "100%",
    height: 7,
    borderRadius: 5,
    overflow: "hidden",
  },

  barFill: {
    height: 7,
    borderRadius: 5,
    minWidth: 3,
  },

  /* =====================================================
     META
  ===================================================== */

  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },

  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    minWidth: 0,
  },

  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
    flexShrink: 0,
  },

  progressLabel: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "600",
    flexShrink: 1,
  },

  progressValue: {
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: "600",
    marginLeft: 8,
    flexShrink: 0,
  },

  /* =====================================================
     EMPTY
  ===================================================== */

  empty: {
    alignItems: "center",
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingVertical: 50,
    paddingHorizontal: spacing.xl,
    marginTop: 4,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyTitle: {
    ...type.h3,
    fontSize: 17,
    lineHeight: 22,
  },

  emptyText: {
    ...type.small,
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 5,
    maxWidth: 285,
  },
});