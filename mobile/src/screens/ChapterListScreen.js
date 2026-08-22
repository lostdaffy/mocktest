import {
  useLayoutEffect,
  useMemo,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
} from "react-native";

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
  getColors,
  getCard,
  gradients,
  spacing,
  radius,
  type,
  shadow,
} from "../theme/theme";


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ChapterListScreen({
  route,
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const scheme =
    useColorScheme();

  const isDark =
    scheme === "dark";

  const colors =
    getColors(isDark);

  const chapterCard =
    getCard(isDark);

  const {
    subject,
  } = route.params || {};

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
     LEVELS
  ======================================================= */

  const LEVELS = useMemo(
    () => [
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
    ],
    [colors]
  );


  /* =======================================================
     CHAPTER STATS
  ======================================================= */

  const stats = useMemo(() => {
    const total =
      chapters.length;

    const completed =
      chapters.filter(
        (chapter) =>
          !!chapter.isCompleted
      ).length;

    const started =
      chapters.filter(
        (chapter) =>
          Number(
            chapter.testsCompleted || 0
          ) > 0
      ).length;

    const percentage =
      total > 0
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
      style={[
        styles.container,
        {
          backgroundColor:
            colors.bg,
        },
      ]}
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
            TOP HEADER
        ================================================= */}

        <View
          style={[
            styles.header,
            {
              paddingTop:
                Math.max(
                  insets.top,
                  10
                ),
            },
          ]}
        >

          {/* BACK */}

          <TouchableOpacity
            style={[
              styles.headerButton,
              {
                backgroundColor:
                  colors.surface,

                borderColor:
                  colors.border,
              },
            ]}
            activeOpacity={0.72}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.ink}
            />
          </TouchableOpacity>


          {/* TITLE */}

          <View
            style={
              styles.headerCenter
            }
          >
            <Text
              style={[
                styles.headerTitle,
                {
                  color:
                    colors.ink,
                },
              ]}
              numberOfLines={1}
            >
              {subject?.name ||
                "Subject"}
            </Text>

            <Text
              style={[
                styles.headerSubtitle,
                {
                  color:
                    colors.slate,
                },
              ]}
            >
              Chapter practice
            </Text>
          </View>


          {/* COUNT */}

          <View
            style={[
              styles.chapterCountBadge,
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
                styles.chapterCountNumber,
                {
                  color:
                    colors.brand,
                },
              ]}
            >
              {stats.total}
            </Text>

            <Text
              style={[
                styles.chapterCountLabel,
                {
                  color:
                    colors.slate,
                },
              ]}
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
          colors={colors}
        />


        {/* =================================================
            SECTION HEADER
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
              Chapters
            </Text>

            <Text
              style={[
                styles.sectionSubtitle,
                {
                  color:
                    colors.slate,
                },
              ]}
            >
              Continue your preparation
            </Text>
          </View>


          <View
            style={[
              styles.progressBadge,
              {
                backgroundColor:
                  colors.successLight,
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={13}
              color={
                colors.success
              }
            />

            <Text
              style={[
                styles.progressBadgeText,
                {
                  color:
                    colors.success,
                },
              ]}
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
          <EmptyState
            colors={colors}
          />
        ) : (
          chapters.map(
            (
              chapter,
              index
            ) => (
              <ChapterCard
                key={
                  chapter._id ||
                  chapter.id ||
                  index
                }
                chapter={
                  chapter
                }
                index={
                  index
                }
                onPress={() =>
                  navigation.navigate(
                    "ChapterPractice",
                    {
                      subject:
                        subject?.name,
                      chapter:
                        chapter.name,
                      currentLevel:
                        chapter.currentLevel,
                      isCompleted:
                        chapter.isCompleted,
                    }
                  )
                }
                LEVELS={
                  LEVELS
                }
                colors={
                  colors
                }
                chapterCard={
                  chapterCard
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
  colors,
}) {
  return (
    <View
      style={
        styles.heroWrap
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
          y: 1,
        }}
        style={[
          styles.hero,
          {
            shadowColor:
              colors.brand,
          },
        ]}
      >

        {/* DECORATIVE ORBS */}

        <View
          pointerEvents="none"
          style={
            styles.heroOrbOne
          }
        />

        <View
          pointerEvents="none"
          style={
            styles.heroOrbTwo
          }
        />

        <View
          pointerEvents="none"
          style={
            styles.heroOrbThree
          }
        />


        {/* SUBJECT ICON */}

        <View
          style={
            styles.heroIconOuter
          }
        >
          <View
            style={[
              styles.heroIconInner,
              {
                backgroundColor:
                  colors.surface,
              },
            ]}
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
              {stats.percentage}%
              {" "}complete
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
  LEVELS,
  colors,
  chapterCard,
}) {
  const started =
    Number(
      chapter.testsCompleted ||
        0
    ) > 0;

  const completed =
    !!chapter.isCompleted;

  const levelIndex =
    Math.max(
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
    Number(
      chapter.testsCompleted ||
        0
    );


  return (
    <TouchableOpacity
      style={[
        chapterCard,
        styles.chapterCard,

        completed && {
          borderColor:
            colors.warnBorder,
        },
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
            {
              backgroundColor:
                completed
                  ? colors.success
                  : colors.brandTint,

              borderColor:
                completed
                  ? colors.success
                  : colors.brandLight,
            },
          ]}
        >
          {completed ? (
            <Ionicons
              name="checkmark"
              size={16}
              color="#FFFFFF"
            />
          ) : (
            <Text
              style={[
                styles.numberText,
                {
                  color:
                    colors.brand,
                },
              ]}
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
              style={[
                styles.chapterName,
                {
                  color:
                    colors.ink,
                },
              ]}
              numberOfLines={1}
            >
              {chapter.name ||
                "Untitled chapter"}
            </Text>


            {completed && (
              <View
                style={[
                  styles.completedBadge,
                  {
                    backgroundColor:
                      colors.warnLight,
                    borderColor:
                      colors.warnBorder,
                  },
                ]}
              >
                <Ionicons
                  name="trophy"
                  size={9}
                  color={
                    colors.warn
                  }
                />

                <Text
                  style={[
                    styles.completedBadgeText,
                    {
                      color:
                        colors.warn,
                    },
                  ]}
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
                style={[
                  styles.chapterMeta,
                  {
                    color:
                      colors.slateSoft,
                  },
                ]}
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
                style={[
                  styles.chapterMetaNew,
                  {
                    color:
                      colors.slateSoft,
                  },
                ]}
              >
                Not started yet
              </Text>
            </View>
          )}

        </View>


        {/* CHEVRON */}

        <View
          style={[
            styles.chevron,
            {
              backgroundColor:
                completed
                  ? colors.successLight
                  : colors.slateLight,
            },
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
            style={[
              styles.currentLevelText,
              {
                color:
                  colors.slate,
              },
            ]}
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
          (
            level,
            currentIndex
          ) => {
            const chapterLevelIndex =
              levelIndexFromChapter(
                chapter,
                LEVELS
              );

            const isPast =
              completed ||
              currentIndex <
                chapterLevelIndex;

            const current =
              !completed &&
              currentIndex ===
                chapterLevelIndex;

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
                  style={[
                    styles.ladderTrack,
                    {
                      backgroundColor:
                        colors.slateLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.ladderBar,

                      isPast && {
                        width:
                          "100%",

                        backgroundColor:
                          completed
                            ? colors.warn
                            : level.tint,
                      },

                      current && {
                        width:
                          "100%",

                        backgroundColor:
                          level.tint,
                      },
                    ]}
                  />
                </View>


                <Text
                  style={[
                    styles.ladderLabel,
                    {
                      color:
                        isPast
                          ? completed
                            ? colors.warn
                            : level.tint
                          : colors.slateSoft,
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
   LEVEL INDEX
========================================================= */

function levelIndexFromChapter(
  chapter,
  LEVELS
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
   EMPTY STATE
========================================================= */

function EmptyState({
  colors,
}) {
  return (
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
          name="documents-outline"
          size={27}
          color={
            colors.brand
          }
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
        No chapters yet
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
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 68,

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
      width: 40,
      height: 40,

      borderRadius: 14,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      ...shadow.soft,
    },

    headerCenter: {
      flex: 1,

      minWidth: 0,

      marginHorizontal: 12,
    },

    headerTitle: {
      fontSize: 18,

      lineHeight: 22,

      fontWeight:
        "800",

      letterSpacing:
        -0.3,
    },

    headerSubtitle: {
      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        "500",

      marginTop: 2,
    },

    chapterCountBadge: {
      minWidth: 52,

      height: 40,

      borderRadius: 13,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    chapterCountNumber: {
      fontSize: 13,

      lineHeight: 15,

      fontWeight:
        "800",
    },

    chapterCountLabel: {
      fontSize: 6.5,

      lineHeight: 9,

      fontWeight:
        "800",

      marginTop: 1,

      letterSpacing:
        0.25,
    },


    /* =====================================================
       HERO
    ===================================================== */

    heroWrap: {
      marginHorizontal:
        spacing.lg,

      marginBottom: 18,
    },

    hero: {
      minHeight: 148,

      borderRadius:
        radius.xl,

      padding: 17,

      flexDirection:
        "row",

      alignItems:
        "center",

      overflow:
        "hidden",

      ...shadow.brand,
    },

    heroContent: {
      flex: 1,

      minWidth: 0,

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
        "rgba(255,255,255,0.14)",

      marginBottom: 6,
    },

    heroLabelText: {
      fontSize: 7,

      lineHeight: 10,

      fontWeight:
        "800",

      color:
        "#FFFFFF",

      letterSpacing:
        0.4,
    },

    heroTitle: {
      fontSize: 19,

      lineHeight: 23,

      fontWeight:
        "800",

      color:
        "#FFFFFF",

      letterSpacing:
        -0.3,
    },

    heroSubtitle: {
      fontSize: 10,

      lineHeight: 14,

      color:
        "rgba(255,255,255,0.76)",

      marginTop: 2,
    },

    heroProgressTrack: {
      height: 5,

      borderRadius: 3,

      backgroundColor:
        "rgba(255,255,255,0.20)",

      overflow:
        "hidden",

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

      lineHeight: 12,

      fontWeight:
        "700",

      color:
        "rgba(255,255,255,0.86)",
    },

    heroStartedText: {
      fontSize: 8.5,

      lineHeight: 12,

      fontWeight:
        "600",

      color:
        "rgba(255,255,255,0.62)",
    },

    heroOrbOne: {
      position:
        "absolute",

      width: 155,
      height: 155,

      borderRadius: 80,

      right: -75,
      top: -75,

      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroOrbTwo: {
      position:
        "absolute",

      width: 90,
      height: 90,

      borderRadius: 45,

      right: 8,
      bottom: -52,

      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    heroOrbThree: {
      position:
        "absolute",

      width: 55,
      height: 55,

      borderRadius: 28,

      left: 85,
      bottom: -30,

      backgroundColor:
        "rgba(167,139,250,0.10)",
    },


    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      marginHorizontal:
        spacing.lg,

      marginBottom: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    sectionCopy: {
      flex: 1,

      minWidth: 0,

      paddingRight: 10,
    },

    sectionTitle: {
      fontSize: 19,

      lineHeight: 23,

      fontWeight:
        "800",

      letterSpacing:
        -0.3,
    },

    sectionSubtitle: {
      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        "500",

      marginTop: 2,
    },

    progressBadge: {
      height: 31,

      paddingHorizontal: 9,

      borderRadius:
        radius.full,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    progressBadgeText: {
      fontSize: 10,

      lineHeight: 13,

      fontWeight:
        "800",
    },


    /* =====================================================
       CHAPTER CARD
    ===================================================== */

    chapterCard: {
      marginHorizontal:
        spacing.lg,

      marginBottom: 10,

      padding: 13,

      borderRadius: 19,

      borderWidth: 1,
    },

    chapterTop: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    numberBox: {
      width: 40,
      height: 40,

      borderRadius: 13,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 10,
    },

    numberText: {
      fontSize: 11,

      lineHeight: 14,

      fontWeight:
        "800",
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
      flexShrink: 1,

      fontSize: 14,

      lineHeight: 18,

      fontWeight:
        "800",
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

      borderWidth: 1,
    },

    completedBadgeText: {
      fontSize: 6.5,

      lineHeight: 9,

      fontWeight:
        "800",

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
      flexShrink: 1,

      fontSize: 9,

      lineHeight: 13,

      fontWeight:
        "500",
    },

    chapterMetaNew: {
      fontSize: 9,

      lineHeight: 13,

      fontWeight:
        "500",

      fontStyle:
        "italic",
    },

    chevron: {
      width: 30,
      height: 30,

      borderRadius: 15,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 8,
    },


    /* =====================================================
       LEVEL HEADER
    ===================================================== */

    levelHeader: {
      marginTop: 13,

      marginBottom: 8,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    currentLevelLabel: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 6,

      flex: 1,

      minWidth: 0,
    },

    currentLevelDot: {
      width: 7,

      height: 7,

      borderRadius: 4,
    },

    currentLevelText: {
      fontSize: 10.5,

      lineHeight: 14,

      fontWeight:
        "700",

      flexShrink: 1,
    },

    levelStepText: {
      fontSize: 10,

      lineHeight: 13,

      fontWeight:
        "800",

      marginLeft: 8,
    },


    /* =====================================================
       LEVEL LADDER
    ===================================================== */

    ladder: {
      flexDirection:
        "row",

      gap: 7,
    },

    ladderStep: {
      flex: 1,

      alignItems:
        "center",
    },

    ladderTrack: {
      width: "100%",

      height: 6,

      borderRadius: 3,

      overflow:
        "hidden",
    },

    ladderBar: {
      width: "0%",

      height: 6,

      borderRadius: 3,
    },

    ladderLabel: {
      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        "600",

      marginTop: 5,

      textAlign:
        "center",
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      alignItems:
        "center",

      marginHorizontal:
        spacing.lg,

      paddingHorizontal: 25,

      paddingVertical: 55,

      borderRadius:
        radius.xl,

      borderWidth: 1,
    },

    emptyIcon: {
      width: 66,
      height: 66,

      borderRadius: 20,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

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

      textAlign:
        "center",

      marginTop: 5,

      maxWidth: 285,
    },

  });