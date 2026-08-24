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
  shadow,
} from "../theme/theme";

/* =========================================================
   SUBJECT META
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
   SCREEN
========================================================= */

export default function SubjectsScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  /* =======================================================
     HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     LOAD
  ======================================================= */

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get("/subjects/my");

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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     PROGRESS
  ======================================================= */

  const progress = useMemo(() => {
    const total = subjects.reduce(
      (sum, subject) =>
        sum +
        Number(
          subject.totalChapters || 0
        ),
      0
    );

    const completed = subjects.reduce(
      (sum, subject) =>
        sum +
        Number(
          subject.completedCount || 0
        ),
      0
    );

    const percentage = total
      ? Math.min(
          Math.round(
            (completed / total) * 100
          ),
          100
        )
      : 0;

    return {
      total,
      completed,
      remaining: Math.max(
        total - completed,
        0
      ),
      percentage,
    };
  }, [subjects]);

  const completedSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          Number(
            subject.totalChapters || 0
          ) > 0 &&
          Number(
            subject.completedCount || 0
          ) >=
            Number(
              subject.totalChapters || 0
            )
      ).length,
    [subjects]
  );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View style={styles.centered}>
        <View style={styles.loaderCircle}>
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>

        <Text style={styles.loadingText}>
          Loading your practice...
        </Text>
      </View>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl +
            insets.bottom +
            10,
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
                  insets.top + 4,
                  16
                ),
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.75}
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

          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>
              Practice
            </Text>

            <Text style={styles.headerSubtitle}>
              Chapter-wise learning
            </Text>
          </View>

        </View>

        {/* =================================================
            INTRO
        ================================================= */}

        <View style={styles.intro}>
          <Text style={styles.introTitle}>
            Build your preparation
          </Text>

          <Text style={styles.introSubtitle}>
            Practice chapter by chapter and
            track your progress.
          </Text>
        </View>

        {/* =================================================
            PROGRESS HERO
        ================================================= */}

        {subjects.length > 0 && (
          <ProgressHero
            progress={progress.percentage}
            completed={progress.completed}
            total={progress.total}
            remaining={progress.remaining}
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
                SECTION
            ============================================= */}

            <View
              style={styles.sectionHeader}
            >
              <View style={styles.sectionContent}>
                <Text
                  style={styles.sectionTitle}
                >
                  Your Subjects
                </Text>

                <Text
                  style={styles.sectionSubtitle}
                >
                  Continue where you left off
                </Text>
              </View>

              <View style={styles.countBadge}>
                <Text
                  style={styles.countNumber}
                >
                  {subjects.length}
                </Text>

                <Text
                  style={styles.countLabel}
                >
                  SUBJECTS
                </Text>
              </View>
            </View>

            {/* =============================================
                SUBJECT CARDS
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
                MANAGE
            ============================================= */}

            <TouchableOpacity
              style={styles.manageCard}
              activeOpacity={0.78}
              onPress={() =>
                navigation.navigate(
                  "SelectSubjects"
                )
              }
            >
              <View style={styles.manageIcon}>
                <Ionicons
                  name="options-outline"
                  size={19}
                  color={colors.brand}
                />
              </View>

              <View style={styles.manageContent}>
                <Text
                  style={styles.manageTitle}
                >
                  Manage Subjects
                </Text>

                <Text
                  style={styles.manageSubtitle}
                >
                  Add, remove or update your
                  subjects
                </Text>
              </View>

              <View style={styles.manageArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.brand}
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
  remaining,
  completedSubjects,
}) {
  return (
    <View style={styles.heroWrap}>
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
        style={styles.hero}
      >
        {/* DECORATION */}

        <View style={styles.heroOrbOne} />
        <View style={styles.heroOrbTwo} />

        {/* LEFT */}

        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Ionicons
              name="trending-up"
              size={10}
              color="#FFFFFF"
            />

            <Text style={styles.heroBadgeText}>
              YOUR PROGRESS
            </Text>
          </View>

          <Text style={styles.heroTitle}>
            Keep moving forward
          </Text>

          <Text style={styles.heroSubtitle}>
            {completed} of {total} chapters
            completed
          </Text>

          <View style={styles.heroStats}>
            <HeroStat
              value={`${progress}%`}
              label="Overall"
            />

            <View style={styles.heroDivider} />

            <HeroStat
              value={completedSubjects}
              label="Done"
            />

            <View style={styles.heroDivider} />

            <HeroStat
              value={remaining}
              label="Left"
            />
          </View>
        </View>

        {/* RING */}

        <View style={styles.progressRing}>
          <View style={styles.progressRingInner}>
            <Text style={styles.ringValue}>
              {progress}%
            </Text>

            <Text style={styles.ringLabel}>
              DONE
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

/* =========================================================
   HERO STAT
========================================================= */

function HeroStat({
  value,
  label,
}) {
  return (
    <View style={styles.heroStat}>
      <Text style={styles.heroStatValue}>
        {value}
      </Text>

      <Text style={styles.heroStatLabel}>
        {label}
      </Text>
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
    Number(subject.totalChapters || 0);

  const completed =
    Number(subject.completedCount || 0);

  const percentage = total
    ? Math.min(
        Math.round(
          (completed / total) * 100
        ),
        100
      )
    : 0;

  const isComplete =
    total > 0 &&
    completed >= total;

  const meta =
    SUBJECT_META[
      index % SUBJECT_META.length
    ];

  return (
    <TouchableOpacity
      style={[
        styles.subjectCard,
        isComplete &&
          styles.subjectCardComplete,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* TOP */}

      <View style={styles.subjectTop}>
        {/* ICON */}

        <View
          style={[
            styles.subjectIcon,
            {
              backgroundColor: meta.bg,
            },
          ]}
        >
          {subject.icon ? (
            <Text style={styles.subjectEmoji}>
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
                styles.completeBadge,
                {
                  backgroundColor:
                    colors.success,
                },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={8}
                color="#FFFFFF"
              />
            </View>
          )}
        </View>

        {/* NAME */}

        <View style={styles.subjectInfo}>
          <Text
            style={styles.subjectName}
            numberOfLines={1}
          >
            {subject.name}
          </Text>

          <View style={styles.subjectMeta}>
            <Ionicons
              name={
                isComplete
                  ? "checkmark-circle"
                  : "book-outline"
              }
              size={11}
              color={
                isComplete
                  ? colors.success
                  : colors.slateSoft
              }
            />

            <Text style={styles.subjectMetaText}>
              {completed} of {total} chapters
            </Text>
          </View>
        </View>

        {/* PERCENT */}

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

      <View style={styles.progressRow}>
        <View style={styles.progressTrack}>
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
                    3
                  )}%`,
                },
              ]}
            />
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={15}
          color={colors.slateSoft}
        />
      </View>

      {/* COMPLETE */}

      {isComplete && (
        <View style={styles.completeMessage}>
          <Ionicons
            name="checkmark-circle"
            size={11}
            color={colors.success}
          />

          <Text
            style={styles.completeMessageText}
          >
            Subject completed
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  navigation,
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconWrap}>
        <View style={styles.emptyIcon}>
          <Ionicons
            name="library-outline"
            size={29}
            color={colors.brand}
          />
        </View>

        <View style={styles.emptySpark}>
          <Ionicons
            name="sparkles"
            size={10}
            color="#F59E0B"
          />
        </View>
      </View>

      <Text style={styles.emptyTitle}>
        No subjects yet
      </Text>

      <Text style={styles.emptyText}>
        Choose the subjects you're
        preparing for and start
        chapter-wise practice.
      </Text>

      <TouchableOpacity
        style={styles.emptyButton}
        activeOpacity={0.85}
        onPress={() =>
          navigation.navigate(
            "SelectSubjects"
          )
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
            y: 0,
          }}
          style={styles.emptyButtonGradient}
        >
          <Text style={styles.emptyButtonText}>
            Choose Subjects
          </Text>

          <Ionicons
            name="arrow-forward"
            size={15}
            color="#FFFFFF"
          />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  loaderCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    ...shadow.soft,
  },

  loadingText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate,
  },

  /* =====================================================
     HEADER
  ===================================================== */

  header: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingBottom: 9,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 12,
  },

  headerTitle: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.4,
  },

  headerSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 2,
    fontWeight: "500",
  },

  /* =====================================================
     INTRO
  ===================================================== */

  intro: {
    paddingHorizontal: 18,
    marginBottom: 15,
  },

  introTitle: {
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.5,
  },

  introSubtitle: {
    fontSize: 11.5,
    lineHeight: 17,
    color: colors.slate,
    marginTop: 3,
  },

  /* =====================================================
     HERO
  ===================================================== */

  heroWrap: {
    marginHorizontal: 18,
    marginBottom: 22,
  },

  hero: {
    minHeight: 164,
    borderRadius: 23,
    paddingHorizontal: 17,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...shadow.brand,
  },

  heroContent: {
    flex: 1,
    minWidth: 0,
    zIndex: 5,
  },

  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor:
      "rgba(255,255,255,0.15)",
    marginBottom: 7,
  },

  heroBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.35,
  },

  heroSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color:
      "rgba(255,255,255,0.78)",
    marginTop: 3,
  },

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  heroStat: {
    minWidth: 38,
  },

  heroStatValue: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  heroStatLabel: {
    fontSize: 7.5,
    lineHeight: 11,
    color:
      "rgba(255,255,255,0.68)",
    marginTop: 1,
    fontWeight: "600",
  },

  heroDivider: {
    width: 1,
    height: 23,
    backgroundColor:
      "rgba(255,255,255,0.22)",
    marginHorizontal: 8,
  },

  heroOrbOne: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 78,
    right: -74,
    top: -75,
    backgroundColor:
      "rgba(255,255,255,0.08)",
  },

  heroOrbTwo: {
    position: "absolute",
    width: 95,
    height: 95,
    borderRadius: 48,
    right: 30,
    bottom: -57,
    backgroundColor:
      "rgba(255,255,255,0.06)",
  },

  /* =====================================================
     RING
  ===================================================== */

  progressRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 7,
    borderColor:
      "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
    zIndex: 4,
  },

  progressRingInner: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor:
      "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  ringValue: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  ringLabel: {
    fontSize: 6.5,
    lineHeight: 9,
    fontWeight: "900",
    color:
      "rgba(255,255,255,0.68)",
    marginTop: 1,
    letterSpacing: 0.5,
  },

  /* =====================================================
     SECTION
  ===================================================== */

  sectionHeader: {
    marginHorizontal: 18,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionContent: {
    flex: 1,
    minWidth: 0,
  },

  sectionTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: "900",
    color: colors.ink,
    letterSpacing: -0.35,
  },

  sectionSubtitle: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 2,
  },

  countBadge: {
    minWidth: 44,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },

  countNumber: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "900",
    color: colors.brand,
  },

  countLabel: {
    fontSize: 6.5,
    lineHeight: 9,
    fontWeight: "900",
    color: colors.slateSoft,
    marginTop: 1,
    letterSpacing: 0.25,
  },

  /* =====================================================
     SUBJECT CARD
  ===================================================== */

  subjectCard: {
    marginHorizontal: 18,
    marginBottom: 10,
    padding: 13,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.soft,
  },

  subjectCardComplete: {
    borderColor:
      colors.successBorder,
  },

  subjectTop: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 49,
  },

  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
    position: "relative",
  },

  subjectEmoji: {
    fontSize: 21,
  },

  completeBadge: {
    position: "absolute",
    right: -3,
    bottom: -3,
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  subjectInfo: {
    flex: 1,
    minWidth: 0,
  },

  subjectName: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "900",
    color: colors.ink,
    marginBottom: 4,
  },

  subjectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  subjectMetaText: {
    fontSize: 9.5,
    lineHeight: 13,
    color: colors.slateSoft,
    fontWeight: "600",
  },

  percentBadge: {
    minWidth: 45,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: radius.full,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  percentBadgeComplete: {
    backgroundColor:
      colors.successLight,
  },

  percentText: {
    fontSize: 11,
    fontWeight: "900",
    color: colors.brand,
  },

  percentTextComplete: {
    color: colors.success,
  },

  /* =====================================================
     PROGRESS
  ===================================================== */

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },

  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.slateLight,
    overflow: "hidden",
  },

  progressFill: {
    height: 6,
    borderRadius: 3,
  },

  completeMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 7,
  },

  completeMessageText: {
    fontSize: 8.5,
    lineHeight: 12,
    fontWeight: "800",
    color: colors.success,
  },

  /* =====================================================
     MANAGE
  ===================================================== */

  manageCard: {
    marginHorizontal: 18,
    marginTop: 1,
    marginBottom: 6,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 18,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandLight,
    flexDirection: "row",
    alignItems: "center",
  },

  manageIcon: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },

  manageContent: {
    flex: 1,
    minWidth: 0,
  },

  manageTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "900",
    color: colors.brand,
  },

  manageSubtitle: {
    fontSize: 9.5,
    lineHeight: 14,
    color: colors.slate,
    marginTop: 2,
    fontWeight: "500",
  },

  manageArrow: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* =====================================================
     EMPTY
  ===================================================== */

  empty: {
    alignItems: "center",
    paddingHorizontal: 28,
    paddingVertical: 58,
  },

  emptyIconWrap: {
    position: "relative",
    marginBottom: 15,
  },

  emptyIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  emptySpark: {
    position: "absolute",
    right: -3,
    top: -2,
    width: 25,
    height: 25,
    borderRadius: 13,
    backgroundColor: "#FFF8DF",
    borderWidth: 2,
    borderColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: "900",
    color: colors.ink,
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
    textAlign: "center",
    maxWidth: 285,
  },

  emptyButton: {
    marginTop: 17,
    borderRadius: 14,
    overflow: "hidden",
    ...shadow.brand,
  },

  emptyButtonGradient: {
    height: 44,
    paddingHorizontal: 19,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  emptyButtonText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});