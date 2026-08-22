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

import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";

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
   SUBJECT META
   Gives each subject a subtle visual identity without
   changing the API data.
========================================================= */

const SUBJECT_META = [
  {
    bg: "#EEF0FF",
    accent: "#5B5FEF",
    gradient: ["#5B5FEF", "#4044D8"],
  },
  {
    bg: "#ECFDF5",
    accent: "#10B981",
    gradient: ["#10B981", "#059669"],
  },
  {
    bg: "#FFF7ED",
    accent: "#F59E0B",
    gradient: ["#F59E0B", "#EA580C"],
  },
  {
    bg: "#FDF2F8",
    accent: "#EC4899",
    gradient: ["#EC4899", "#DB2777"],
  },
  {
    bg: "#F0F9FF",
    accent: "#0EA5E9",
    gradient: ["#0EA5E9", "#0284C7"],
  },
  {
    bg: "#F5F3FF",
    accent: "#8B5CF6",
    gradient: ["#8B5CF6", "#7C3AED"],
  },
];

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function SubjectsScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     HIDE NATIVE HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     LOAD SUBJECTS
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            "/subjects/my"
          );

        setSubjects(
          res.data?.subjects || []
        );
      } catch (err) {
        console.log(
          "Subjects loading error:",
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
     PROGRESS
  ======================================================= */

  const progress = useMemo(() => {
    const total =
      subjects.reduce(
        (sum, subject) =>
          sum +
          (subject.totalChapters ||
            0),
        0
      );

    const completed =
      subjects.reduce(
        (sum, subject) =>
          sum +
          (subject.completedCount ||
            0),
        0
      );

    const percentage = total
      ? Math.round(
          (completed / total) *
            100
        )
      : 0;

    return {
      total,
      completed,
      percentage,
    };
  }, [subjects]);

  /* =======================================================
     COMPLETED SUBJECTS
  ======================================================= */

  const completedSubjects =
    useMemo(
      () =>
        subjects.filter(
          (subject) =>
            subject.totalChapters >
              0 &&
            subject.completedCount >=
              subject.totalChapters
        ).length,
      [subjects]
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={styles.centered}
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
            styles.loadingText
          }
        >
          Loading your practice...
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
            >
              Practice
            </Text>

            <Text
              style={
                styles.headerSubtitle
              }
            >
              Chapter-wise learning
            </Text>
          </View>

          <TouchableOpacity
            style={
              styles.headerButton
            }
            activeOpacity={0.7}
            onPress={load}
          >
            <Ionicons
              name="refresh-outline"
              size={19}
              color={colors.slate}
            />
          </TouchableOpacity>
        </View>

        {/* =================================================
            INTRO
        ================================================= */}

        <View
          style={
            styles.introSection
          }
        >
          <Text
            style={
              styles.introTitle
            }
          >
            Build your preparation
          </Text>

          <Text
            style={
              styles.introSubtitle
            }
          >
            Practice chapter by chapter,
            from easy to advanced.
          </Text>
        </View>

        {/* =================================================
            PROGRESS HERO
        ================================================= */}

        {subjects.length > 0 && (
          <ProgressHero
            progress={
              progress.percentage
            }
            completed={
              progress.completed
            }
            total={
              progress.total
            }
            completedSubjects={
              completedSubjects
            }
          />
        )}

        {/* =================================================
            EMPTY
        ================================================= */}

        {subjects.length === 0 ? (
          <EmptyState
            navigation={navigation}
          />
        ) : (
          <>
            {/* =============================================
                SECTION HEADER
            ============================================= */}

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
                  Your Subjects
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Continue where you left
                  off
                </Text>
              </View>

              <View
                style={
                  styles.countBadge
                }
              >
                <Text
                  style={
                    styles.countNumber
                  }
                >
                  {subjects.length}
                </Text>

                <Text
                  style={
                    styles.countLabel
                  }
                >
                  SUBJECTS
                </Text>
              </View>
            </View>

            {/* =============================================
                SUBJECTS
            ============================================= */}

            {subjects.map(
              (subject, index) => (
                <SubjectCard
                  key={subject._id}
                  subject={subject}
                  index={index}
                  onPress={() =>
                    navigation.navigate(
                      "ChapterList",
                      {
                        subject,
                      }
                    )
                  }
                />
              )
            )}

            {/* =============================================
                ADD SUBJECTS
            ============================================= */}

            <TouchableOpacity
              style={
                styles.addCard
              }
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate(
                  "SelectSubjects"
                )
              }
            >
              <View
                style={
                  styles.addIcon
                }
              >
                <Ionicons
                  name="add"
                  size={20}
                  color={colors.brand}
                />
              </View>

              <View
                style={
                  styles.addContent
                }
              >
                <Text
                  style={
                    styles.addTitle
                  }
                >
                  Manage Subjects
                </Text>

                <Text
                  style={
                    styles.addSubtitle
                  }
                >
                  Add new subjects or
                  update your selection
                </Text>
              </View>

              <View
                style={
                  styles.addArrow
                }
              >
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.slateSoft}
                />
              </View>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

/* =========================================================
   PROGRESS HERO
========================================================= */

function ProgressHero({
  progress,
  completed,
  total,
  completedSubjects,
}) {
  return (
    <View
      style={
        styles.progressHeroWrap
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
          styles.progressHero
        }
      >
        {/* DECORATION */}

        <View
          style={
            styles.progressOrbOne
          }
        />

        <View
          style={
            styles.progressOrbTwo
          }
        />

        {/* CONTENT */}

        <View
          style={
            styles.progressContent
          }
        >
          <View
            style={
              styles.progressBadge
            }
          >
            <Ionicons
              name="trending-up"
              size={10}
              color="#FFFFFF"
            />

            <Text
              style={
                styles.progressBadgeText
              }
            >
              YOUR PROGRESS
            </Text>
          </View>

          <Text
            style={
              styles.progressTitle
            }
          >
            Keep moving forward
          </Text>

          <Text
            style={
              styles.progressSubtitle
            }
          >
            {completed} of {total} chapters
            completed
          </Text>

          <View
            style={
              styles.progressStats
            }
          >
            <ProgressStat
              value={`${progress}%`}
              label="Overall"
            />

            <View
              style={
                styles.progressDivider
              }
            />

            <ProgressStat
              value={completedSubjects}
              label="Completed"
            />

            <View
              style={
                styles.progressDivider
              }
            />

            <ProgressStat
              value={Math.max(
                total - completed,
                0
              )}
              label="Remaining"
            />
          </View>
        </View>

        {/* RING */}

        <ProgressRing
          percentage={progress}
        />
      </LinearGradient>
    </View>
  );
}

/* =========================================================
   PROGRESS STAT
========================================================= */

function ProgressStat({
  value,
  label,
}) {
  return (
    <View
      style={
        styles.progressStat
      }
    >
      <Text
        style={
          styles.progressStatValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.progressStatLabel
        }
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   PROGRESS RING
========================================================= */

function ProgressRing({
  percentage,
}) {
  return (
    <View
      style={
        styles.ringOuter
      }
    >
      <View
        style={
          styles.ringInner
        }
      >
        <Text
          style={
            styles.ringValue
          }
        >
          {percentage}%
        </Text>

        <Text
          style={
            styles.ringLabel
          }
        >
          DONE
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   SUBJECT CARD
========================================================= */

function SubjectCard({
  subject,
  index,
  onPress,
}) {
  const total =
    subject.totalChapters || 0;

  const completed =
    subject.completedCount || 0;

  const percentage = total
    ? Math.min(
        Math.round(
          (completed / total) *
            100
        ),
        100
      )
    : 0;

  const isComplete =
    total > 0 &&
    completed >= total;

  const meta =
    SUBJECT_META[
      index %
        SUBJECT_META.length
    ];

  return (
    <TouchableOpacity
      style={
        styles.subjectCard
      }
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* TOP */}

      <View
        style={
          styles.subjectTop
        }
      >
        {/* ICON */}

        <View
          style={[
            styles.subjectIconWrap,
            {
              backgroundColor:
                meta.bg,
            },
          ]}
        >
          {subject.icon ? (
            <Text
              style={
                styles.subjectEmoji
              }
            >
              {subject.icon}
            </Text>
          ) : (
            <Ionicons
              name="book-outline"
              size={21}
              color={meta.accent}
            />
          )}

          {isComplete && (
            <View
              style={[
                styles.completeDot,
                {
                  backgroundColor:
                    meta.accent,
                },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={7}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* NAME */}

        <View
          style={
            styles.subjectInfo
          }
        >
          <Text
            style={
              styles.subjectName
            }
            numberOfLines={1}
          >
            {subject.name}
          </Text>

          <View
            style={
              styles.subjectMetaRow
            }
          >
            <Ionicons
              name={
                isComplete
                  ? "checkmark-circle"
                  : "book-outline"
              }
              size={11}
              color={
                isComplete
                  ? "#10B981"
                  : colors.slateSoft
              }
            />

            <Text
              style={
                styles.subjectMeta
              }
            >
              {completed} of {total} chapters
            </Text>
          </View>
        </View>

        {/* PERCENTAGE */}

        <View
          style={[
            styles.percentBadge,
            isComplete &&
              styles.percentBadgeComplete,
          ]}
        >
          <Text
            style={[
              styles.percentText,
              isComplete &&
                styles.percentTextComplete,
            ]}
          >
            {percentage}%
          </Text>
        </View>
      </View>

      {/* PROGRESS */}

      <View
        style={
          styles.progressRow
        }
      >
        <View
          style={
            styles.progressTrack
          }
        >
          {percentage > 0 && (
            <LinearGradient
              colors={
                isComplete
                  ? gradients.success
                  : meta.gradient
              }
              start={{
                x: 0,
                y: 0,
              }}
              end={{
                x: 1,
                y: 0,
              }}
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(
                    percentage,
                    2
                  )}%`,
                },
              ]}
            />
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={15}
          color={
            colors.slateSoft
          }
        />
      </View>

      {/* COMPLETE MESSAGE */}

      {isComplete && (
        <View
          style={
            styles.completeMessage
          }
        >
          <Ionicons
            name="checkmark-circle"
            size={11}
            color="#10B981"
          />

          <Text
            style={
              styles.completeMessageText
            }
          >
            Subject completed
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  navigation,
}) {
  return (
    <View
      style={
        styles.empty
      }
    >
      {/* ICON */}

      <View
        style={
          styles.emptyIconWrap
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="book-outline"
            size={28}
            color={colors.brand}
          />
        </View>

        <View
          style={
            styles.emptySparkle
          }
        >
          <Ionicons
            name="sparkles"
            size={10}
            color="#F59E0B"
          />
        </View>
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No subjects yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Choose the subjects you're
        preparing for and start
        chapter-wise practice.
      </Text>

      <TouchableOpacity
        style={
          styles.emptyButton
        }
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(
            "SelectSubjects"
          )
        }
      >
        <Text
          style={
            styles.emptyButtonText
          }
        >
          Choose Subjects
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
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 10,
      ...shadow.soft,
    },

    loadingText: {
      fontSize: 12,
      color: colors.slate,
      fontWeight:
        "600",
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 74,
      paddingHorizontal:
        spacing.lg,
      paddingBottom:
        spacing.sm,
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        colors.bg,
    },

    headerButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
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
      marginTop: 2,
      fontWeight:
        "500",
    },

    /* =====================================================
       INTRO
    ===================================================== */

    introSection: {
      paddingHorizontal:
        spacing.lg,
      marginBottom:
        spacing.md,
    },

    introTitle: {
      fontSize: 21,
      lineHeight: 26,
      fontWeight:
        "800",
      color: colors.ink,
      letterSpacing:
        -0.4,
    },

    introSubtitle: {
      fontSize: 11.5,
      lineHeight: 17,
      color: colors.slate,
      marginTop: 3,
    },

    /* =====================================================
       PROGRESS HERO
    ===================================================== */

    progressHeroWrap: {
      marginHorizontal: 18,
      marginBottom: 22,
    },

    progressHero: {
      minHeight: 158,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 17,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.brand,
    },

    progressContent: {
      flex: 1,
      zIndex: 5,
    },

    progressBadge: {
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
      marginBottom: 7,
    },

    progressBadgeText: {
      fontSize: 7.5,
      fontWeight:
        "800",
      color: "#FFFFFF",
      letterSpacing:
        0.4,
    },

    progressTitle: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight:
        "800",
      color: "#FFFFFF",
      letterSpacing:
        -0.3,
    },

    progressSubtitle: {
      fontSize: 10.5,
      color:
        "rgba(255,255,255,0.78)",
      marginTop: 3,
    },

    progressStats: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 11,
    },

    progressStat: {
      minWidth: 40,
    },

    progressStatValue: {
      fontSize: 12,
      fontWeight:
        "800",
      color: "#FFFFFF",
    },

    progressStatLabel: {
      fontSize: 7.5,
      color:
        "rgba(255,255,255,0.68)",
      marginTop: 1,
      fontWeight:
        "600",
    },

    progressDivider: {
      width: 1,
      height: 22,
      backgroundColor:
        "rgba(255,255,255,0.22)",
      marginHorizontal: 7,
    },

    progressOrbOne: {
      position:
        "absolute",
      width: 150,
      height: 150,
      borderRadius: 75,
      right: -70,
      top: -70,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    progressOrbTwo: {
      position:
        "absolute",
      width: 95,
      height: 95,
      borderRadius: 48,
      right: 20,
      bottom: -55,
      backgroundColor:
        "rgba(255,255,255,0.07)",
    },

    /* =====================================================
       PROGRESS RING
    ===================================================== */

    ringOuter: {
      width: 82,
      height: 82,
      borderRadius: 41,
      borderWidth: 7,
      borderColor:
        "rgba(255,255,255,0.24)",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 8,
      zIndex: 3,
    },

    ringInner: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor:
        "rgba(255,255,255,0.12)",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    ringValue: {
      fontSize: 17,
      fontWeight:
        "800",
      color: "#FFFFFF",
    },

    ringLabel: {
      fontSize: 6.5,
      fontWeight:
        "800",
      color:
        "rgba(255,255,255,0.68)",
      marginTop: 1,
      letterSpacing:
        0.5,
    },

    /* =====================================================
       SECTION HEADER
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
      color: colors.ink,
      letterSpacing:
        -0.3,
    },

    sectionSubtitle: {
      fontSize: 10,
      color: colors.slate,
      marginTop: 2,
    },

    countBadge: {
      minWidth: 43,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    countNumber: {
      fontSize: 13,
      fontWeight:
        "800",
      color:
        colors.brand,
    },

    countLabel: {
      fontSize: 6.5,
      fontWeight:
        "800",
      color:
        colors.slateSoft,
      marginTop: 1,
    },

    /* =====================================================
       SUBJECT CARD
    ===================================================== */

    subjectCard: {
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

    subjectTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      minHeight: 49,
    },

    subjectIconWrap: {
      width: 47,
      height: 47,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
      position:
        "relative",
    },

    subjectEmoji: {
      fontSize: 21,
    },

    completeDot: {
      position:
        "absolute",
      right: -2,
      bottom: -2,
      width: 16,
      height: 16,
      borderRadius: 8,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
    },

    subjectInfo: {
      flex: 1,
      minWidth: 0,
    },

    subjectName: {
      fontSize: 15,
      fontWeight:
        "800",
      color:
        colors.ink,
      marginBottom: 3,
    },

    subjectMetaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
    },

    subjectMeta: {
      fontSize: 9.5,
      color:
        colors.slateSoft,
      fontWeight:
        "600",
    },

    percentBadge: {
      minWidth: 43,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius:
        radius.full,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 7,
    },

    percentBadgeComplete: {
      backgroundColor:
        colors.successLight,
    },

    percentText: {
      fontSize: 11,
      fontWeight:
        "800",
      color:
        colors.brand,
    },

    percentTextComplete: {
      color:
        colors.success,
    },

    /* =====================================================
       SUBJECT PROGRESS
    ===================================================== */

    progressRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 7,
      marginTop: 11,
    },

    progressTrack: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        colors.slateLight,
      overflow: "hidden",
    },

    progressFill: {
      height: 6,
      borderRadius: 3,
    },

    completeMessage: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginTop: 7,
    },

    completeMessageText: {
      fontSize: 8.5,
      fontWeight:
        "700",
      color:
        colors.success,
    },

    /* =====================================================
       ADD SUBJECTS
    ===================================================== */

    addCard: {
      marginHorizontal: 18,
      marginTop: 2,
      marginBottom: 5,
      minHeight: 67,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor:
        colors.brandLight,
      backgroundColor:
        colors.brandTint,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    addIcon: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    addContent: {
      flex: 1,
    },

    addTitle: {
      fontSize: 13,
      fontWeight:
        "800",
      color:
        colors.brand,
    },

    addSubtitle: {
      fontSize: 9.5,
      color:
        colors.slate,
      marginTop: 2,
      fontWeight:
        "500",
    },

    addArrow: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 7,
    },

    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      alignItems:
        "center",
      paddingHorizontal: 28,
      paddingVertical: 55,
    },

    emptyIconWrap: {
      position:
        "relative",
      marginBottom: 14,
    },

    emptyIcon: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    emptySparkle: {
      position:
        "absolute",
      right: -3,
      top: -2,
      width: 25,
      height: 25,
      borderRadius: 13,
      backgroundColor:
        "#FFF8DF",
      borderWidth: 2,
      borderColor:
        colors.bg,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      fontSize: 18,
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
      maxWidth: 285,
    },

    emptyButton: {
      height: 42,
      paddingHorizontal: 18,
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
      marginTop: 16,
      ...shadow.brand,
    },

    emptyButtonText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight:
        "800",
    },
  });