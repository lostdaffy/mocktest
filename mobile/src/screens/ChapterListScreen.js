import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  LinearGradient,
} from "expo-linear-gradient";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import {
  colors,
  gradients,
  spacing,
  radius,
  type,
  shadow,
  card,
} from "../theme/theme";

/* =========================================================
   LEVELS
========================================================= */

const LEVELS = [
  {
    key: "easy",
    label: "Easy",
    short: "E",
    tint: colors.easy,
  },
  {
    key: "medium",
    label: "Medium",
    short: "M",
    tint: colors.medium,
  },
  {
    key: "hard",
    label: "Hard",
    short: "H",
    tint: colors.hard,
  },
  {
    key: "advanced",
    label: "Advanced",
    short: "A",
    tint: colors.advanced,
  },
];

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ChapterListScreen({
  route,
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const {
    subject,
  } = route.params;

  const chapters =
    subject?.chapters || [];

  /* =======================================================
     HIDE NATIVE HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     CHAPTER STATS
  ======================================================= */

  const stats = useMemo(() => {
    const total =
      chapters.length;

    const completed =
      chapters.filter(
        (chapter) =>
          chapter.isCompleted
      ).length;

    const started =
      chapters.filter(
        (chapter) =>
          chapter.testsCompleted >
          0
      ).length;

    const percentage = total
      ? Math.round(
          (completed / total) *
            100
        )
      : 0;

    return {
      total,
      completed,
      started,
      percentage,
    };
  }, [chapters]);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View
      style={styles.container}
    >
      <ScrollView
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl +
            insets.bottom,
        }}
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={[
            styles.header,
            {
              paddingTop:
                Math.max(
                  insets.top,
                  12
                ),
            },
          ]}
        >
          <TouchableOpacity
            style={
              styles.headerButton
            }
            activeOpacity={0.7}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={21}
              color={colors.ink}
            />
          </TouchableOpacity>

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={
                styles.headerTitle
              }
              numberOfLines={1}
            >
              {subject?.name ||
                "Subject"}
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Chapter practice
            </Text>
          </View>

          <View
            style={
              styles.chapterCountBadge
            }
          >
            <Text
              style={
                styles.chapterCountNumber
              }
            >
              {stats.total}
            </Text>

            <Text
              style={
                styles.chapterCountLabel
              }
            >
              CHAPTERS
            </Text>
          </View>
        </View>

        {/* =================================================
            SUBJECT HERO
        ================================================= */}

        <SubjectHero
          subject={subject}
          stats={stats}
        />

   
        {/* =================================================
            SECTION HEADER
        ================================================= */}

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
              Chapters
            </Text>

            <Text
              style={
                styles.sectionSubtitle
              }
            >
              Continue your preparation
            </Text>
          </View>

          <View
            style={
              styles.progressBadge
            }
          >
            <Ionicons
              name="checkmark-circle"
              size={12}
              color={colors.success}
            />

            <Text
              style={
                styles.progressBadgeText
              }
            >
              {stats.completed}/
              {stats.total}
            </Text>
          </View>
        </View>

        {/* =================================================
            CHAPTER LIST
        ================================================= */}

        {chapters.length === 0 ? (
          <EmptyState />
        ) : (
          chapters.map(
            (chapter, index) => (
              <ChapterCard
                key={
                  chapter._id ||
                  chapter.id ||
                  index
                }
                chapter={chapter}
                index={index}
                onPress={() =>
                  navigation.navigate(
                    "ChapterPractice",
                    {
                      subject:
                        subject.name,
                      chapter:
                        chapter.name,
                      currentLevel:
                        chapter.currentLevel,
                      isCompleted:
                        chapter.isCompleted,
                    }
                  )
                }
              />
            )
          )
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================
   SUBJECT HERO
========================================================= */

function SubjectHero({
  subject,
  stats,
}) {
  return (
    <View
      style={
        styles.heroWrap
      }
    >
      <LinearGradient
        colors={gradients.brand}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={
          styles.hero
        }
      >
        {/* DECORATION */}

        <View
          style={
            styles.heroOrbOne
          }
        />

        <View
          style={
            styles.heroOrbTwo
          }
        />

        {/* ICON */}

        <View
          style={
            styles.heroIconOuter
          }
        >
          <View
            style={
              styles.heroIconInner
            }
          >
            <Text
              style={
                styles.heroEmoji
              }
            >
              {subject?.icon ||
                "📚"}
            </Text>
          </View>
        </View>

        {/* CONTENT */}

        <View
          style={
            styles.heroContent
          }
        >
          <View
            style={
              styles.heroLabel
            }
          >
            <Ionicons
              name="book"
              size={10}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.heroLabelText
              }
            >
              SUBJECT PRACTICE
            </Text>
          </View>

          <Text
            style={
              styles.heroTitle
            }
            numberOfLines={1}
          >
            {subject?.name ||
              "Subject"}
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
          >
            {stats.completed} of{" "}
            {stats.total} chapters
            completed
          </Text>

          {/* PROGRESS */}

          <View
            style={
              styles.heroProgressTrack
            }
          >
            <View
              style={[
                styles.heroProgressFill,
                {
                  width: `${Math.max(
                    stats.percentage,
                    stats.total
                      ? 3
                      : 0
                  )}%`,
                },
              ]}
            />
          </View>

          <View
            style={
              styles.heroBottom
            }
          >
            <Text
              style={
                styles.heroProgressText
              }
            >
              {stats.percentage}% complete
            </Text>

            <Text
              style={
                styles.heroStartedText
              }
            >
              {stats.started} started
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/* =========================================================
   CHAPTER CARD
========================================================= */

function ChapterCard({
  chapter,
  index,
  onPress,
}) {
  const started =
    (chapter.testsCompleted ||
      0) > 0;

  const completed =
    !!chapter.isCompleted;

  const levelIndex = Math.max(
    LEVELS.findIndex(
      (level) =>
        level.key ===
        chapter.currentLevel
    ),
    0
  );

  const activeLevel =
    LEVELS[levelIndex] ||
    LEVELS[0];

  const testsCompleted =
    chapter.testsCompleted ||
    0;

  return (
    <TouchableOpacity
      style={[
        styles.chapterCard,
        completed &&
          styles.chapterCardComplete,
      ]}
      activeOpacity={0.78}
      onPress={onPress}
    >
      {/* =================================================
          TOP ROW
      ================================================= */}

      <View
        style={
          styles.chapterTop
        }
      >
        {/* NUMBER */}

        <View
          style={[
            styles.numberBox,
            completed &&
              styles.numberBoxComplete,
          ]}
        >
          {completed ? (
            <Ionicons
              name="checkmark"
              size={15}
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={
                styles.numberText
              }
            >
              {String(
                index + 1
              ).padStart(2, "0")}
            </Text>
          )}
        </View>

        {/* CONTENT */}

        <View
          style={
            styles.chapterContent
          }
        >
          <View
            style={
              styles.chapterTitleRow
            }
          >
            <Text
              style={
                styles.chapterName
              }
              numberOfLines={1}
            >
              {chapter.name}
            </Text>

            {completed && (
              <View
                style={
                  styles.completedBadge
                }
              >
                <Ionicons
                  name="trophy"
                  size={9}
                  color="#D99700"
                />

                <Text
                  style={
                    styles.completedBadgeText
                  }
                >
                  DONE
                </Text>
              </View>
            )}
          </View>

          {started ? (
            <View
              style={
                styles.chapterMetaRow
              }
            >
              <Ionicons
                name="analytics-outline"
                size={11}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.chapterMeta
                }
                numberOfLines={1}
              >
                Best{" "}
                {chapter.bestAccuracy ||
                  0}
                % ·{" "}
                {testsCompleted} test
                {testsCompleted !== 1
                  ? "s"
                  : ""}{" "}
                taken
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.chapterMetaRow
              }
            >
              <Ionicons
                name="ellipse-outline"
                size={11}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.chapterMetaNew
                }
              >
                Not started yet
              </Text>
            </View>
          )}
        </View>

        {/* ARROW */}

        <View
          style={[
            styles.chevron,
            completed &&
              styles.chevronComplete,
          ]}
        >
          <Ionicons
            name="chevron-forward"
            size={15}
            color={
              completed
                ? colors.success
                : colors.slate
            }
          />
        </View>
      </View>

      {/* =================================================
          CURRENT LEVEL
      ================================================= */}

      <View
        style={
          styles.levelHeader
        }
      >
        <View
          style={
            styles.currentLevelLabel
          }
        >
          <View
            style={[
              styles.currentLevelDot,
              {
                backgroundColor:
                  completed
                    ? colors.warn
                    : activeLevel.tint,
              },
            ]}
          />

          <Text
            style={
              styles.currentLevelText
            }
          >
            {completed
              ? "All levels cleared"
              : `Current level · ${activeLevel.label}`}
          </Text>
        </View>

        {!completed && (
          <Text
            style={[
              styles.levelStepText,
              {
                color:
                  activeLevel.tint,
              },
            ]}
          >
            {levelIndex + 1}/
            {LEVELS.length}
          </Text>
        )}
      </View>

      {/* =================================================
          LEVEL LADDER
      ================================================= */}

      <View
        style={
          styles.ladder
        }
      >
        {LEVELS.map(
          (level, levelIndex) => {
            const isPast =
              completed ||
              levelIndex <
                levelIndexFromChapter(
                  chapter
                );

            const current =
              !completed &&
              levelIndex ===
                levelIndexFromChapter(
                  chapter
                );

            return (
              <View
                key={
                  level.key
                }
                style={
                  styles.ladderStep
                }
              >
                <View
                  style={
                    styles.ladderTrack
                  }
                >
                  <View
                    style={[
                      styles.ladderBar,
                      isPast && {
                        backgroundColor:
                          completed
                            ? colors.warn
                            : level.tint,
                      },
                      current && {
                        backgroundColor:
                          level.tint,
                      },
                      current &&
                        styles.ladderBarCurrent,
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.ladderLabel,
                    isPast && {
                      color:
                        completed
                          ? colors.warn
                          : level.tint,
                    },
                    current && {
                      fontWeight:
                        "800",
                    },
                  ]}
                >
                  {level.label}
                </Text>
              </View>
            );
          }
        )}
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   LEVEL INDEX HELPER
========================================================= */

function levelIndexFromChapter(
  chapter
) {
  const index =
    LEVELS.findIndex(
      (level) =>
        level.key ===
        chapter.currentLevel
    );

  return index >= 0
    ? index
    : 0;
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState() {
  return (
    <View
      style={
        styles.empty
      }
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <Ionicons
          name="documents-outline"
          size={27}
          color={colors.brand}
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No chapters yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Chapters for this subject
        will appear here when they
        are available.
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

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 72,
      paddingHorizontal:
        spacing.lg,
      paddingBottom:
        spacing.sm,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.soft,
    },

    headerCenter: {
      flex: 1,
      marginHorizontal: 12,
    },

    headerTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight:
        "800",
      color: colors.ink,
      letterSpacing:
        -0.3,
    },

    headerSubtitle: {
      fontSize: 10,
      color: colors.slate,
      fontWeight:
        "500",
      marginTop: 2,
    },

    chapterCountBadge: {
      minWidth: 46,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    chapterCountNumber: {
      fontSize: 13,
      fontWeight:
        "800",
      color:
        colors.brand,
      lineHeight: 15,
    },

    chapterCountLabel: {
      fontSize: 6.5,
      fontWeight:
        "800",
      color:
        colors.slateSoft,
      marginTop: 1,
    },

    /* =====================================================
       HERO
    ===================================================== */

    heroWrap: {
      marginHorizontal: 18,
      marginBottom: 15,
    },

    hero: {
      minHeight: 146,
      borderRadius: 24,
      padding: 17,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.brand,
    },

    heroContent: {
      flex: 1,
      marginLeft: 13,
      zIndex: 5,
    },

    heroIconOuter: {
      width: 58,
      height: 58,
      borderRadius: 19,
      backgroundColor:
        "rgba(255,255,255,0.18)",
      alignItems:
        "center",
      justifyContent:
        "center",
      zIndex: 5,
    },

    heroIconInner: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    heroEmoji: {
      fontSize: 22,
    },

    heroLabel: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius:
        radius.full,
      backgroundColor:
        "rgba(255,255,255,0.15)",
      marginBottom: 6,
    },

    heroLabelText: {
      fontSize: 7,
      fontWeight:
        "800",
      color: "#FFFFFF",
      letterSpacing:
        0.4,
    },

    heroTitle: {
      fontSize: 19,
      lineHeight: 23,
      fontWeight:
        "800",
      color: "#FFFFFF",
      letterSpacing:
        -0.3,
    },

    heroSubtitle: {
      fontSize: 10,
      color:
        "rgba(255,255,255,0.75)",
      marginTop: 2,
    },

    heroProgressTrack: {
      height: 5,
      borderRadius: 3,
      backgroundColor:
        "rgba(255,255,255,0.2)",
      overflow: "hidden",
      marginTop: 10,
    },

    heroProgressFill: {
      height: 5,
      borderRadius: 3,
      backgroundColor:
        "#FFFFFF",
    },

    heroBottom: {
      flexDirection:
        "row",
      justifyContent:
        "space-between",
      alignItems:
        "center",
      marginTop: 5,
    },

    heroProgressText: {
      fontSize: 8.5,
      fontWeight:
        "700",
      color:
        "rgba(255,255,255,0.85)",
    },

    heroStartedText: {
      fontSize: 8.5,
      fontWeight:
        "600",
      color:
        "rgba(255,255,255,0.6)",
    },

    heroOrbOne: {
      position:
        "absolute",
      width: 150,
      height: 150,
      borderRadius: 75,
      right: -72,
      top: -70,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroOrbTwo: {
      position:
        "absolute",
      width: 85,
      height: 85,
      borderRadius: 43,
      right: 10,
      bottom: -50,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    /* =====================================================
       INFO
    ===================================================== */

    infoCard: {
      marginHorizontal: 18,
      marginBottom: 20,
      padding: 11,
      borderRadius: 17,
      backgroundColor:
        colors.brandTint,
      borderWidth: 1,
      borderColor:
        colors.brandLight,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    infoIcon: {
      width: 35,
      height: 35,
      borderRadius: 11,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 9,
    },

    infoContent: {
      flex: 1,
    },

    infoTitle: {
      fontSize: 11,
      fontWeight:
        "800",
      color:
        colors.brand,
      marginBottom: 2,
    },

    infoText: {
      fontSize: 9.5,
      lineHeight: 14,
      color:
        colors.slate,
      fontWeight:
        "500",
    },

    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      marginHorizontal: 18,
      marginBottom: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    sectionTitle: {
      fontSize: 19,
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

    progressBadge: {
      height: 31,
      paddingHorizontal: 9,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.successLight,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
    },

    progressBadgeText: {
      fontSize: 10,
      fontWeight:
        "800",
      color:
        colors.success,
    },

    /* =====================================================
       CHAPTER CARD
    ===================================================== */

    chapterCard: {
      marginHorizontal: 18,
      marginBottom: 10,
      padding: 12,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    chapterCardComplete: {
      borderColor:
        "#FDE7A7",
    },

    chapterTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    numberBox: {
      width: 39,
      height: 39,
      borderRadius: 13,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    numberBoxComplete: {
      backgroundColor:
        colors.success,
    },

    numberText: {
      fontSize: 11,
      fontWeight:
        "800",
      color:
        colors.brand,
    },

    chapterContent: {
      flex: 1,
      minWidth: 0,
    },

    chapterTitleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 6,
    },

    chapterName: {
      fontSize: 14,
      lineHeight: 18,
      fontWeight:
        "800",
      color:
        colors.ink,
      flexShrink: 1,
    },

    completedBadge: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      backgroundColor:
        "#FFF7DF",
    },

    completedBadgeText: {
      fontSize: 6.5,
      fontWeight:
        "800",
      color:
        "#D99700",
      letterSpacing:
        0.3,
    },

    chapterMetaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginTop: 3,
    },

    chapterMeta: {
      fontSize: 9,
      color:
        colors.slateSoft,
      fontWeight:
        "500",
      flexShrink: 1,
    },

    chapterMetaNew: {
      fontSize: 9,
      color:
        colors.slateSoft,
      fontWeight:
        "500",
      fontStyle:
        "italic",
    },

    chevron: {
      width: 29,
      height: 29,
      borderRadius: 15,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 8,
    },

    chevronComplete: {
      backgroundColor:
        colors.successLight,
    },

    /* =====================================================
   LEVEL HEADER
===================================================== */

levelHeader: {
  marginTop: 12,
  marginBottom: 8,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
},

currentLevelLabel: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

currentLevelDot: {
  width: 7,
  height: 7,
  borderRadius: 4,
},

currentLevelText: {
  fontSize: 10.5,
  fontWeight: "700",
  color: colors.slate,
},

levelStepText: {
  fontSize: 10,
  fontWeight: "800",
},

/* =====================================================
   LEVEL LADDER
===================================================== */

ladder: {
  flexDirection: "row",
  gap: 7,
},

ladderStep: {
  flex: 1,
  alignItems: "center",
},

ladderTrack: {
  width: "100%",
  height: 6,
  borderRadius: 3,
  backgroundColor: colors.slateLight,
  overflow: "hidden",
},

ladderBar: {
  width: "0%",
  height: 6,
  borderRadius: 3,
},

ladderBarCurrent: {
  height: 6,
},

ladderLabel: {
  fontSize: 10.5,
  lineHeight: 14,
  fontWeight: "600",
  color: colors.slateSoft,
  marginTop: 5,
  textAlign: "center",
},

    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      alignItems:
        "center",
      paddingHorizontal: 25,
      paddingVertical: 60,
    },

    emptyIcon: {
      width: 65,
      height: 65,
      borderRadius: 33,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 12,
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight:
        "800",
      color:
        colors.ink,
      marginBottom: 5,
    },

    emptyText: {
      fontSize: 12,
      lineHeight: 18,
      color:
        colors.slate,
      textAlign:
        "center",
      maxWidth: 280,
    },
  });