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
  FlatList,
  ActivityIndicator,
} from "react-native";

import AppAlert from "../components/AppAlert";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";

import {
  colors,
  spacing,
  radius,
  type,
  shadow,
} from "../theme/theme";

/* =========================================================
   EXAM META
========================================================= */

const EXAM_META = {
  SSC_CGL: {
    icon: "school",
    grad: ["#5B5FEF", "#4044D8"],
    light: "#EEF0FF",
    accent: "#5B5FEF",
  },

  SSC_MTS: {
    icon: "briefcase",
    grad: ["#10B981", "#059669"],
    light: "#ECFDF5",
    accent: "#10B981",
  },

  SSC_CHSL: {
    icon: "document-text",
    grad: ["#A78BFA", "#7C3AED"],
    light: "#F5F3FF",
    accent: "#7C3AED",
  },

  UP_POLICE: {
    icon: "shield-checkmark",
    grad: ["#FB7185", "#E11D48"],
    light: "#FFF1F2",
    accent: "#E11D48",
  },

  RAILWAY: {
    icon: "train",
    grad: ["#FB923C", "#EA580C"],
    light: "#FFF7ED",
    accent: "#EA580C",
  },

  BANKING: {
    icon: "card",
    grad: ["#22D3EE", "#0891B2"],
    light: "#ECFEFF",
    accent: "#0891B2",
  },

  CTET: {
    icon: "person",
    grad: ["#F472B6", "#DB2777"],
    light: "#FDF2F8",
    accent: "#DB2777",
  },
};

const DEFAULT_META = {
  icon: "document-text",
  grad: ["#5B5FEF", "#4044D8"],
  light: "#EEF0FF",
  accent: "#5B5FEF",
};

/* =========================================================
   SCREEN
========================================================= */

export default function ExamSeriesScreen({
  route,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    examStage,
    examName,
  } = route.params || {};

  const { user } = useAuth();

  const subscribed = isSubscribed(user);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  /* =======================================================
     HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     META
  ======================================================= */

  const meta =
    EXAM_META[examStage] || DEFAULT_META;

  /* =======================================================
     LOAD
  ======================================================= */

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(
        `/tests/exam-series/${examStage}`
      );

      setTests(res.data?.tests || []);
    } catch (err) {
      console.log(
        "Exam series loading error:",
        err
      );

      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [examStage]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     START TEST
  ======================================================= */

  async function startTest(test) {
    if (!test?._id) return;

    const locked =
      !test.isFree && !subscribed;

    if (locked) {
      AppAlert.alert(
        "Premium test",
        "Upgrade to unlock this mock test.",
        [
          {
            text: "Later",
            style: "cancel",
          },
          {
            text: "Upgrade",
            onPress: () =>
              navigation.navigate(
                "Subscription"
              ),
          },
        ]
      );

      return;
    }

    setStarting(test._id);

    try {
      const res = await api.get(
        `/tests/${test._id}`
      );

      navigation.navigate(
        "TestTaking",
        {
          testId:
            res.data?.test?._id ||
            test._id,
        }
      );
    } catch (err) {
      if (
        err.response?.data?.code ===
        "SUBSCRIPTION_REQUIRED"
      ) {
        AppAlert.alert(
          "Premium test",
          err.response?.data?.message ||
            "Upgrade to unlock this test.",
          [
            {
              text: "Later",
              style: "cancel",
            },
            {
              text: "Upgrade",
              onPress: () =>
                navigation.navigate(
                  "Subscription"
                ),
            },
          ]
        );
      } else {
        AppAlert.alert(
          "Something went wrong",
          err.response?.data?.message ||
            "Couldn't load the test."
        );
      }
    } finally {
      setStarting(null);
    }
  }

  /* =======================================================
     FEATURED
  ======================================================= */

  const featured = useMemo(() => {
    if (!tests.length) return null;

    return (
      tests.find(
        (test) =>
          test.attemptStatus ===
          "in_progress"
      ) ||
      tests.find(
        (test) =>
          test.attemptStatus !==
          "completed"
      ) ||
      tests[0]
    );
  }, [tests]);

  const rest = useMemo(
    () =>
      tests.filter(
        (test) =>
          test._id !==
          featured?._id
      ),
    [tests, featured]
  );

  /* =======================================================
     STATS
  ======================================================= */

  const freeCount = useMemo(
    () =>
      tests.filter(
        (test) => test.isFree
      ).length,
    [tests]
  );

  const completedCount = useMemo(
    () =>
      tests.filter(
        (test) =>
          test.attemptStatus ===
          "completed"
      ).length,
    [tests]
  );

  const progress =
    tests.length > 0
      ? Math.round(
          (completedCount /
            tests.length) *
            100
        )
      : 0;

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          {
            paddingTop: insets.top,
          },
        ]}
      >
        <View
          style={styles.loaderBox}
        >
          <ActivityIndicator
            size="small"
            color={meta.accent}
          />
        </View>

        <Text
          style={styles.loadingText}
        >
          Loading mock tests...
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
        data={rest}
        keyExtractor={(item) =>
          item._id
        }
        showsVerticalScrollIndicator={false}
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
                      spacing.sm
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
                  name="chevron-back"
                  size={20}
                  color={colors.ink}
                />
              </TouchableOpacity>

              <View
                style={styles.headerCenter}
              >
                <Text
                  style={styles.headerTitle}
                  numberOfLines={1}
                >
                  {examName ||
                    "Mock Tests"}
                </Text>

                <Text
                  style={styles.headerSubtitle}
                >
                  Mock test series
                </Text>
              </View>

            </View>

            {/* =================================================
                HERO
            ================================================= */}

            <SeriesHero
              examName={examName}
              meta={meta}
              total={tests.length}
              free={freeCount}
              completed={completedCount}
              progress={progress}
            />

            {/* =================================================
                FEATURED
            ================================================= */}

            {featured && (
              <>
                <SectionHeader
                  title={
                    featured.attemptStatus ===
                    "in_progress"
                      ? "Continue Practice"
                      : "Recommended"
                  }
                  subtitle={
                    featured.attemptStatus ===
                    "in_progress"
                      ? "Pick up where you left off"
                      : "Your next recommended mock"
                  }
                />

                <FeaturedTestCard
                  test={featured}
                  subscribed={subscribed}
                  meta={meta}
                  starting={
                    starting ===
                    featured._id
                  }
                  onPress={() =>
                    startTest(featured)
                  }
                />
              </>
            )}

            {/* =================================================
                ALL TESTS
            ================================================= */}

            {rest.length > 0 && (
              <View
                style={styles.listHeader}
              >
                <View
                  style={styles.listHeaderCopy}
                >
                  <Text
                    style={styles.listTitle}
                  >
                    All Mock Tests
                  </Text>

                  <Text
                    style={styles.listSubtitle}
                  >
                    Complete practice series
                  </Text>
                </View>

                <View
                  style={styles.countBadge}
                >
                  <Text
                    style={styles.countNumber}
                  >
                    {tests.length}
                  </Text>

                  <Text
                    style={styles.countLabel}
                  >
                    TESTS
                  </Text>
                </View>
              </View>
            )}
          </>
        }
        ListEmptyComponent={
          !featured ? (
            <EmptyState />
          ) : null
        }
        renderItem={({
          item,
          index,
        }) => (
          <MockTestRow
            item={item}
            index={index}
            subscribed={subscribed}
            meta={meta}
            starting={
              starting === item._id
            }
            onPress={() =>
              startTest(item)
            }
          />
        )}
      />
    </View>
  );
}

/* =========================================================
   SERIES HERO
========================================================= */

function SeriesHero({
  examName,
  meta,
  total,
  free,
  completed,
  progress,
}) {
  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor:
            meta.light,
          borderColor:
            `${meta.accent}20`,
        },
      ]}
    >
      {/* DECORATIVE SHAPE */}

      <View
        style={[
          styles.heroOrb,
          {
            backgroundColor:
              `${meta.accent}12`,
          },
        ]}
      />

      {/* LEFT */}

      <View
        style={styles.heroContent}
      >
        <View
          style={[
            styles.heroBadge,
            {
              backgroundColor:
                `${meta.accent}12`,
            },
          ]}
        >
          <View
            style={[
              styles.heroBadgeDot,
              {
                backgroundColor:
                  meta.accent,
              },
            ]}
          />

          <Text
            style={[
              styles.heroBadgeText,
              {
                color:
                  meta.accent,
              },
            ]}
          >
            MOCK SERIES
          </Text>
        </View>

        <Text
          style={styles.heroTitle}
          numberOfLines={2}
        >
          {examName ||
            "Mock Tests"}
        </Text>

        <Text
          style={styles.heroDescription}
          numberOfLines={2}
        >
          Full-length practice tests
          to improve speed, accuracy
          and exam confidence.
        </Text>

        {/* PROGRESS */}

        <View
          style={styles.progressRow}
        >
          <View
            style={styles.progressTrack}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.max(
                    progress,
                    testsProgressMin(
                      total
                    )
                  )}%`,
                  backgroundColor:
                    meta.accent,
                },
              ]}
            />
          </View>

          <Text
            style={[
              styles.progressText,
              {
                color:
                  meta.accent,
              },
            ]}
          >
            {progress}%
          </Text>
        </View>

        {/* STATS */}

        <View
          style={styles.heroStats}
        >
          <HeroStat
            value={total}
            label="Tests"
          />

          <View
            style={styles.heroDivider}
          />

          <HeroStat
            value={free}
            label="Free"
          />

          <View
            style={styles.heroDivider}
          />

          <HeroStat
            value={completed}
            label="Completed"
          />
        </View>
      </View>

      {/* RIGHT ART */}

      <View
        style={styles.heroArt}
      >
        <View
          style={[
            styles.artCircle,
            {
              backgroundColor:
                `${meta.accent}12`,
            },
          ]}
        />

        <View
          style={styles.paper}
        >
          <LinearGradient
            colors={meta.grad}
            start={{
              x: 0,
              y: 0,
            }}
            end={{
              x: 1,
              y: 1,
            }}
            style={styles.paperTop}
          >
            <Ionicons
              name={meta.icon}
              size={18}
              color="#FFFFFF"
            />
          </LinearGradient>

          <PaperLine checked />
          <PaperLine checked />
          <PaperLine />
        </View>

        <View
          style={styles.timerBubble}
        >
          <Ionicons
            name="timer-outline"
            size={16}
            color="#FF684A"
          />
        </View>

        <View
          style={styles.sparkleBubble}
        >
          <Ionicons
            name="sparkles"
            size={12}
            color="#F59E0B"
          />
        </View>
      </View>
    </View>
  );
}

function testsProgressMin(total) {
  return total > 0 ? 2 : 0;
}

/* =========================================================
   PAPER LINE
========================================================= */

function PaperLine({
  checked = false,
}) {
  return (
    <View
      style={styles.paperLineRow}
    >
      <View
        style={[
          styles.paperCheck,
          !checked &&
            styles.paperEmpty,
        ]}
      >
        {checked && (
          <Ionicons
            name="checkmark"
            size={7}
            color="#FFFFFF"
          />
        )}
      </View>

      <View
        style={
          checked
            ? styles.paperLine
            : styles.paperLineShort
        }
      />
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
    <View
      style={styles.heroStat}
    >
      <Text
        style={styles.heroStatValue}
      >
        {value}
      </Text>

      <Text
        style={styles.heroStatLabel}
      >
        {label}
      </Text>
    </View>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  subtitle,
}) {
  return (
    <View
      style={styles.sectionHeader}
    >
      <Text
        style={styles.sectionTitle}
      >
        {title}
      </Text>

      <Text
        style={styles.sectionSubtitle}
      >
        {subtitle}
      </Text>
    </View>
  );
}

/* =========================================================
   FEATURED TEST
========================================================= */

function FeaturedTestCard({
  test,
  subscribed,
  meta,
  starting,
  onPress,
}) {
  const locked =
    !test.isFree &&
    !subscribed;

  const isResume =
    test.attemptStatus ===
    "in_progress";

  const questions =
    test.questions?.length || 0;

  return (
    <TouchableOpacity
      style={[
        styles.featuredCard,
        {
          borderColor:
            `${meta.accent}25`,
        },
      ]}
      activeOpacity={0.82}
      onPress={onPress}
      disabled={starting}
    >
      <View
        style={[
          styles.featuredAccent,
          {
            backgroundColor:
              meta.accent,
          },
        ]}
      />

      <View
        style={[
          styles.featuredIconBox,
          {
            backgroundColor:
              meta.light,
          },
        ]}
      >
        <LinearGradient
          colors={meta.grad}
          start={{
            x: 0,
            y: 0,
          }}
          end={{
            x: 1,
            y: 1,
          }}
          style={styles.featuredIcon}
        >
          <Ionicons
            name={meta.icon}
            size={20}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>

      <View
        style={styles.featuredContent}
      >
        <View
          style={styles.featuredBadge}
        >
          <Ionicons
            name={
              isResume
                ? "play"
                : "sparkles"
            }
            size={8}
            color={
              isResume
                ? "#FF684A"
                : meta.accent
            }
          />

          <Text
            style={[
              styles.featuredBadgeText,
              {
                color: isResume
                  ? "#FF684A"
                  : meta.accent,
              },
            ]}
          >
            {isResume
              ? "CONTINUE"
              : "RECOMMENDED"}
          </Text>
        </View>

        <Text
          style={styles.featuredTitle}
          numberOfLines={1}
        >
          {test.title}
        </Text>

        <View
          style={styles.featuredMeta}
        >
          <Meta
            icon="time-outline"
            text={`${test.durationMinutes || 0} min`}
          />

          {questions > 0 && (
            <Meta
              icon="help-circle-outline"
              text={`${questions} Q`}
            />
          )}

          <StatusTag
            locked={locked}
            isFree={test.isFree}
          />
        </View>
      </View>

      <View
        style={styles.featuredArrow}
      >
        {starting ? (
          <ActivityIndicator
            size="small"
            color={meta.accent}
          />
        ) : (
          <Ionicons
            name={
              locked
                ? "lock-closed-outline"
                : isResume
                ? "play"
                : "chevron-forward"
            }
            size={16}
            color={
              locked
                ? "#D99700"
                : meta.accent
            }
          />
        )}
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   MOCK TEST ROW
========================================================= */

function MockTestRow({
  item,
  index,
  subscribed,
  meta,
  starting,
  onPress,
}) {
  const locked =
    !item.isFree &&
    !subscribed;

  const isActive =
    item.attemptStatus ===
    "in_progress";

  const isCompleted =
    item.attemptStatus ===
    "completed";

  const seriesNumber =
    item.seriesNumber ||
    index + 2;

  const questions =
    item.questions?.length || 0;

  return (
    <View
      style={styles.row}
    >
      {/* NUMBER */}

      <View
        style={[
          styles.numberColumn,
          isActive &&
            styles.numberColumnActive,
        ]}
      >
        <Text
          style={[
            styles.numberText,
            isActive &&
              styles.numberTextActive,
          ]}
        >
          {String(
            seriesNumber
          ).padStart(2, "0")}
        </Text>

        {isActive && (
          <View
            style={styles.activeDot}
          />
        )}
      </View>

      {/* CARD */}

      <TouchableOpacity
        style={[
          styles.rowCard,
          isActive &&
            styles.rowCardActive,
          locked &&
            styles.rowCardLocked,
        ]}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={starting}
      >
        <View
          style={[
            styles.rowIcon,
            {
              backgroundColor:
                isActive
                  ? meta.light
                  : isCompleted
                  ? colors.successLight
                  : colors.slateLight,
            },
          ]}
        >
          <Ionicons
            name={
              isActive
                ? "play"
                : isCompleted
                ? "checkmark-done"
                : locked
                ? "lock-closed-outline"
                : "document-text-outline"
            }
            size={16}
            color={
              isActive
                ? meta.accent
                : isCompleted
                ? colors.success
                : locked
                ? colors.warn
                : colors.slate
            }
          />
        </View>

        <View
          style={styles.rowContent}
        >
          <Text
            style={styles.rowTitle}
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View
            style={styles.rowMeta}
          >
            <Meta
              icon="time-outline"
              text={`${item.durationMinutes || 0} min`}
            />

            {questions > 0 && (
              <Meta
                icon="help-circle-outline"
                text={`${questions} Q`}
              />
            )}
          </View>

          <View
            style={styles.rowTags}
          >
            <StatusTag
              locked={locked}
              isFree={item.isFree}
            />

            {isCompleted &&
              item.bestAccuracy !=
                null && (
                <View
                  style={styles.accuracyTag}
                >
                  <Ionicons
                    name="analytics-outline"
                    size={8}
                    color={
                      meta.accent
                    }
                  />

                  <Text
                    style={
                      styles.accuracyText
                    }
                  >
                    {item.bestAccuracy}%
                  </Text>
                </View>
              )}

            {isActive && (
              <View
                style={styles.resumeTag}
              >
                <Text
                  style={
                    styles.resumeText
                  }
                >
                  In Progress
                </Text>
              </View>
            )}
          </View>
        </View>

        <View
          style={styles.rowArrow}
        >
          {starting ? (
            <ActivityIndicator
              size="small"
              color={meta.accent}
            />
          ) : (
            <Ionicons
              name={
                locked
                  ? "lock-closed-outline"
                  : isActive
                  ? "play"
                  : "chevron-forward"
              }
              size={15}
              color={
                locked
                  ? colors.warn
                  : isActive
                  ? meta.accent
                  : colors.slateSoft
              }
            />
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

/* =========================================================
   STATUS TAG
========================================================= */

function StatusTag({
  locked,
  isFree,
}) {
  return (
    <View
      style={[
        styles.statusTag,
        locked
          ? styles.premiumTag
          : styles.freeTag,
      ]}
    >
      <Ionicons
        name={
          locked
            ? "lock-closed"
            : "checkmark-circle"
        }
        size={8}
        color={
          locked
            ? colors.warn
            : colors.success
        }
      />

      <Text
        style={[
          styles.statusText,
          {
            color: locked
              ? colors.warn
              : colors.success,
          },
        ]}
      >
        {locked
          ? "Premium"
          : isFree
          ? "Free"
          : "Unlocked"}
      </Text>
    </View>
  );
}

/* =========================================================
   META
========================================================= */

function Meta({
  icon,
  text,
}) {
  return (
    <View
      style={styles.metaItem}
    >
      <Ionicons
        name={icon}
        size={11}
        color={colors.slateSoft}
      />

      <Text
        style={styles.metaText}
        numberOfLines={1}
      >
        {text}
      </Text>
    </View>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState() {
  return (
    <View
      style={styles.empty}
    >
      <View
        style={styles.emptyIcon}
      >
        <Ionicons
          name="document-text-outline"
          size={27}
          color={colors.brand}
        />

        <View
          style={styles.emptySparkle}
        >
          <Ionicons
            name="sparkles"
            size={9}
            color={colors.warn}
          />
        </View>
      </View>

      <Text
        style={styles.emptyTitle}
      >
        No mock tests yet
      </Text>

      <Text
        style={styles.emptyText}
      >
        New mock test series will
        appear here when they are
        available.
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     GENERAL
  ======================================================= */

  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  listContent: {
    paddingBottom: spacing.xxl,
  },

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  loaderBox: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },

  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: colors.slate,
    fontWeight: "600",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
  },

  headerButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },

  headerCenter: {
    flex: 1,
    minWidth: 0,
    marginHorizontal: 11,
  },

  headerTitle: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.35,
  },

  headerSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slateSoft,
    fontWeight: "500",
    marginTop: 1,
  },

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    minHeight: 170,
    marginHorizontal: spacing.lg,
    marginBottom: 22,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 23,
    borderWidth: 1,
    flexDirection: "row",
    overflow: "hidden",
  },

  heroContent: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingRight: 7,
    zIndex: 3,
  },

  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: 7,
  },

  heroBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },

  heroBadgeText: {
    fontSize: 7.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  heroTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
  },

  heroDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: colors.slate,
    marginTop: 4,
    maxWidth: 205,
  },

  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    maxWidth: 210,
  },

  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor:
      "rgba(23,32,46,0.10)",
    overflow: "hidden",
  },

  progressFill: {
    height: 5,
    borderRadius: 3,
  },

  progressText: {
    width: 34,
    textAlign: "right",
    fontSize: 9,
    fontWeight: "800",
  },

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 9,
  },

  heroStat: {
    minWidth: 37,
  },

  heroStatValue: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    color: colors.ink,
  },

  heroStatLabel: {
    fontSize: 7.5,
    lineHeight: 11,
    fontWeight: "600",
    color: colors.slateSoft,
    marginTop: 1,
  },

  heroDivider: {
    width: 1,
    height: 21,
    backgroundColor:
      "rgba(23,32,46,0.10)",
    marginHorizontal: 7,
  },

  heroOrb: {
    position: "absolute",
    width: 155,
    height: 155,
    borderRadius: 78,
    right: -75,
    top: -50,
  },

  /* =======================================================
     HERO ART
  ======================================================= */

  heroArt: {
    width: 91,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },

  artCircle: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
  },

  paper: {
    width: 59,
    height: 78,
    borderRadius: 11,
    backgroundColor: colors.surface,
    alignItems: "center",
    paddingTop: 7,
    transform: [
      {
        rotate: "7deg",
      },
    ],
    ...shadow.soft,
  },

  paperTop: {
    width: 35,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },

  paperLineRow: {
    width: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
  },

  paperCheck: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },

  paperEmpty: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  paperLine: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.slateLight,
  },

  paperLineShort: {
    width: 19,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.slateLight,
  },

  timerBubble: {
    position: "absolute",
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF4EF",
    borderWidth: 2,
    borderColor: colors.surface,
    left: -2,
    bottom: 13,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },

  sparkleBubble: {
    position: "absolute",
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: "#FFF8DF",
    borderWidth: 2,
    borderColor: colors.surface,
    right: -3,
    top: 17,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    marginHorizontal: spacing.lg,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: 10.5,
    lineHeight: 15,
    color: colors.slateSoft,
    marginTop: 2,
  },

  /* =======================================================
     FEATURED
  ======================================================= */

  featuredCard: {
    minHeight: 82,
    marginHorizontal: spacing.lg,
    marginBottom: 22,
    padding: 11,
    backgroundColor: colors.surface,
    borderRadius: 19,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    ...shadow.soft,
  },

  featuredAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },

  featuredIconBox: {
    width: 51,
    height: 51,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  featuredIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  featuredContent: {
    flex: 1,
    minWidth: 0,
    marginLeft: 10,
  },

  featuredBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF4F0",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 4,
  },

  featuredBadgeText: {
    fontSize: 7.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  featuredTitle: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 5,
  },

  featuredMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },

  featuredArrow: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },

  /* =======================================================
     LIST HEADER
  ======================================================= */

  listHeader: {
    marginHorizontal: spacing.lg,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  listHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },

  listTitle: {
    fontSize: 19,
    lineHeight: 23,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.3,
  },

  listSubtitle: {
    fontSize: 10.5,
    color: colors.slateSoft,
    marginTop: 2,
  },

  countBadge: {
    width: 43,
    height: 41,
    borderRadius: 13,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  countNumber: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    color: colors.brand,
  },

  countLabel: {
    fontSize: 6.5,
    fontWeight: "800",
    color: colors.slateSoft,
    marginTop: 1,
  },

  /* =======================================================
     ROW
  ======================================================= */

  row: {
    flexDirection: "row",
    gap: 7,
    marginHorizontal: spacing.lg,
    marginBottom: 9,
  },

  numberColumn: {
    width: 25,
    alignItems: "center",
    paddingTop: 18,
  },

  numberColumnActive: {
    paddingTop: 15,
  },

  numberText: {
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "800",
    color: colors.slateSoft,
  },

  numberTextActive: {
    color: colors.brand,
  },

  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#FF684A",
    marginTop: 3,
  },

  rowCard: {
    flex: 1,
    minHeight: 72,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    ...shadow.soft,
  },

  rowCardActive: {
    backgroundColor: colors.brandTint,
    borderColor: colors.brandLight,
  },

  rowCardLocked: {
    opacity: 0.82,
  },

  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },

  rowContent: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 4,
  },

  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },

  rowTags: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },

  rowArrow: {
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 5,
  },

  /* =======================================================
     META
  ======================================================= */

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    maxWidth: 100,
  },

  metaText: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.slateSoft,
    fontWeight: "600",
    flexShrink: 1,
  },

  statusTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
  },

  premiumTag: {
    backgroundColor: colors.warnLight,
  },

  freeTag: {
    backgroundColor: colors.successLight,
  },

  statusText: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "700",
  },

  accuracyTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.brandLight,
  },

  accuracyText: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "800",
    color: colors.brand,
  },

  resumeTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "#FFF1EC",
  },

  resumeText: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: "700",
    color: "#FF684A",
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  empty: {
    alignItems: "center",
    paddingVertical: 65,
    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 20,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
    position: "relative",
  },

  emptySparkle: {
    position: "absolute",
    right: 1,
    top: 1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFF8DF",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.ink,
  },

  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.slate,
    textAlign: "center",
    maxWidth: 280,
    marginTop: 4,
  },
});