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

import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppAlert from "../components/AppAlert";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";

import {
  colors,
  spacing,
  radius,
  type,
  card,
  shadow,
} from "../theme/theme";

/* =========================================================
   LEVELS
========================================================= */

const LEVELS = [
  {
    key: "easy",
    label: "Easy",
    tint: colors.easy,
  },
  {
    key: "medium",
    label: "Medium",
    tint: colors.medium,
  },
  {
    key: "hard",
    label: "Hard",
    tint: colors.hard,
  },
  {
    key: "advanced",
    label: "Advanced",
    tint: colors.advanced,
  },
];

/* =========================================================
   SCREEN
========================================================= */

export default function ChapterPracticeScreen({
  route,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    subject,
    chapter,
    currentLevel,
    isCompleted,
  } = route.params || {};

  const { user } = useAuth();
  const subscribed = isSubscribed(user);

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  /* =======================================================
     REMOVE NATIVE HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     CURRENT LEVEL
  ======================================================= */

  const currentLevelIdx = Math.max(
    0,
    LEVELS.findIndex(
      (level) => level.key === currentLevel
    )
  );

  const [activeIdx, setActiveIdx] =
    useState(currentLevelIdx);

  /* =======================================================
     LOAD TESTS
  ======================================================= */

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get(
        `/tests/practice-series/${encodeURIComponent(
          subject || ""
        )}/${encodeURIComponent(chapter || "")}`
      );

      setTests(res.data?.tests || []);
    } catch (err) {
      console.log(
        "ChapterPracticeScreen load error:",
        err
      );

      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [subject, chapter]);

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

    const premiumLocked =
      !test.isFree && !subscribed;

    if (premiumLocked) {
      AppAlert.alert(
        "Premium test",
        "Upgrade to unlock every practice test in this chapter.",
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

      navigation.navigate("TestTaking", {
        testId:
          res.data?.test?._id ||
          test._id,
      });
    } catch (err) {
      if (
        err.response?.data?.code ===
        "SUBSCRIPTION_REQUIRED"
      ) {
        AppAlert.alert(
          "Premium test",
          err.response?.data?.message ||
            "Upgrade to unlock this practice test.",
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
            "Couldn't load the test"
        );
      }
    } finally {
      setStarting(null);
    }
  }

  /* =======================================================
     LEVEL COUNTS
  ======================================================= */

  const counts = useMemo(() => {
    const result = {};

    LEVELS.forEach((level) => {
      result[level.key] = 0;
    });

    tests.forEach((test) => {
      if (
        Object.prototype.hasOwnProperty.call(
          result,
          test.difficultyLevel
        )
      ) {
        result[test.difficultyLevel] += 1;
      }
    });

    return result;
  }, [tests]);

  /* =======================================================
     PROGRESS
  ======================================================= */

  const completedTests = useMemo(
    () =>
      tests.filter(
        (test) =>
          test.attemptStatus ===
          "completed"
      ).length,
    [tests]
  );

  const inProgressTests = useMemo(
    () =>
      tests.filter(
        (test) =>
          test.attemptStatus ===
          "in_progress"
      ).length,
    [tests]
  );

  const progress =
    tests.length > 0
      ? Math.round(
          (completedTests /
            tests.length) *
            100
        )
      : 0;

  /* =======================================================
     ACTIVE LEVEL
  ======================================================= */

  const activeLevel =
    LEVELS[activeIdx] || LEVELS[0];

  const activeLocked =
    !isCompleted &&
    activeIdx > currentLevelIdx;

  const activeTests = useMemo(
    () =>
      tests.filter(
        (test) =>
          test.difficultyLevel ===
          activeLevel.key
      ),
    [tests, activeLevel.key]
  );

  /* =======================================================
     FEATURED TEST
  ======================================================= */

  const featuredTest = useMemo(() => {
    if (!activeTests.length) {
      return null;
    }

    return (
      activeTests.find(
        (test) =>
          test.attemptStatus ===
          "in_progress"
      ) ||
      activeTests.find(
        (test) =>
          test.attemptStatus !==
          "completed"
      ) ||
      activeTests[0]
    );
  }, [activeTests]);

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
        <ActivityIndicator
          size="large"
          color={colors.brand}
        />

        <Text style={styles.loadingText}>
          Loading practice...
        </Text>
      </View>
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View style={styles.container}>
      <FlatList
        data={activeTests}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl + insets.bottom,
        }}
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
                      spacing.md
                    ),
                },
              ]}
            >
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Ionicons
                  name="chevron-back"
                  size={21}
                  color={colors.ink}
                />
              </TouchableOpacity>

              <View
                style={styles.headerText}
              >
                <Text
                  style={styles.headerTitle}
                  numberOfLines={1}
                >
                  Practice
                </Text>

                <Text
                  style={styles.headerSubtitle}
                  numberOfLines={1}
                >
                  {subject}
                </Text>
              </View>
            </View>

            {/* =================================================
                HERO
            ================================================= */}

            <PracticeHero
              chapter={chapter}
              subject={subject}
              activeLevel={activeLevel}
              isCompleted={isCompleted}
              progress={progress}
              completedTests={
                completedTests
              }
              totalTests={tests.length}
              inProgressTests={
                inProgressTests
              }
              featuredTest={featuredTest}
              activeLocked={activeLocked}
              starting={starting}
              onStart={() => {
                if (featuredTest) {
                  startTest(
                    featuredTest
                  );
                }
              }}
            />

            {/* =================================================
                LEVEL HEADER
            ================================================= */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Practice Levels
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Clear each level to move
                  ahead
                </Text>
              </View>

              <View
                style={
                  styles.levelProgress
                }
              >
                <Text
                  style={
                    styles.levelProgressText
                  }
                >
                  {isCompleted
                    ? "4/4"
                    : `${Math.min(
                        currentLevelIdx +
                          1,
                        4
                      )}/4`}
                </Text>
              </View>
            </View>

            {/* =================================================
                LEVEL SELECTOR
            ================================================= */}

            <View
              style={styles.levelRow}
            >
              {LEVELS.map(
                (level, index) => {
                  const locked =
                    !isCompleted &&
                    index >
                      currentLevelIdx;

                  const completed =
                    isCompleted ||
                    index <
                      currentLevelIdx;

                  const active =
                    activeIdx === index;

                  const count =
                    counts[
                      level.key
                    ] || 0;

                  return (
                    <TouchableOpacity
                      key={
                        level.key
                      }
                      style={[
                        styles.levelItem,
                        active &&
                          styles.levelItemActive,
                        locked &&
                          styles.levelItemLocked,
                      ]}
                      activeOpacity={0.78}
                      onPress={() =>
                        setActiveIdx(
                          index
                        )
                      }
                    >
                      <View
                        style={[
                          styles.levelDot,
                          active &&
                            styles.levelDotActive,
                        ]}
                      >
                        <Ionicons
                          name={
                            locked
                              ? "lock-closed"
                              : completed
                              ? "checkmark"
                              : "ellipse"
                          }
                          size={
                            completed ||
                            locked
                              ? 14
                              : 7
                          }
                          color={
                            active
                              ? "#fff"
                              : locked
                              ? colors.slateSoft
                              : level.tint
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.levelName,
                          active &&
                            styles.levelNameActive,
                          locked &&
                            styles.levelNameLocked,
                        ]}
                      >
                        {
                          level.label
                        }
                      </Text>

                      <Text
                        style={[
                          styles.levelCount,
                          active &&
                            styles.levelCountActive,
                        ]}
                      >
                        {count}{" "}
                        {count === 1
                          ? "test"
                          : "tests"}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </View>

            {/* =================================================
                LOCK NOTICE
            ================================================= */}

            {activeLocked && (
              <View
                style={
                  styles.lockedNotice
                }
              >
                <View
                  style={
                    styles.lockedIcon
                  }
                >
                  <Ionicons
                    name="lock-closed"
                    size={15}
                    color={
                      colors.slate
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={
                      styles.lockedTitle
                    }
                  >
                    {activeLevel.label}{" "}
                    locked
                  </Text>

                  <Text
                    style={
                      styles.lockedText
                    }
                  >
                    Complete a{" "}
                    {
                      LEVELS[
                        activeIdx - 1
                      ]?.label
                    }{" "}
                    test first to unlock
                    this level.
                  </Text>
                </View>
              </View>
            )}

            {/* =================================================
                TEST HEADER
            ================================================= */}

            <View
              style={
                styles.testsHeader
              }
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={
                    styles.testsTitle
                  }
                >
                  {activeLevel.label} Tests
                </Text>

                <Text
                  style={
                    styles.testsSubtitle
                  }
                >
                  {activeLocked
                    ? "Previous level needs to be cleared"
                    : activeTests.length
                    ? `${activeTests.length} ${
                        activeTests.length ===
                        1
                          ? "test"
                          : "tests"
                      } available`
                    : "No tests available yet"}
                </Text>
              </View>

              {!activeLocked &&
                activeTests.length >
                  0 && (
                  <View
                    style={
                      styles.readyBadge
                    }
                  >
                    <View
                      style={
                        styles.readyDot
                      }
                    />

                    <Text
                      style={
                        styles.readyText
                      }
                    >
                      READY
                    </Text>
                  </View>
                )}
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            level={
              activeLevel.label
            }
            locked={activeLocked}
          />
        }
        renderItem={({
          item,
          index,
        }) => (
          <PracticeTestCard
            item={item}
            index={index}
            level={activeLevel}
            subscribed={
              subscribed
            }
            starting={
              starting
            }
            activeLocked={
              activeLocked
            }
            onPress={() => {
              if (activeLocked) {
                AppAlert.alert(
                  "Level locked",
                  `Complete a ${
                    LEVELS[
                      activeIdx - 1
                    ]?.label ||
                    "previous"
                  } test first.`
                );

                return;
              }

              startTest(item);
            }}
          />
        )}
      />
    </View>
  );
}

/* =========================================================
   HERO
========================================================= */

function PracticeHero({
  chapter,
  subject,
  activeLevel,
  isCompleted,
  progress,
  completedTests,
  totalTests,
  inProgressTests,
  featuredTest,
  activeLocked,
  starting,
  onStart,
}) {
  const hasResume =
    featuredTest?.attemptStatus ===
    "in_progress";

  return (
    <View style={styles.hero}>
      <View
        style={styles.heroTop}
      >
        <View
          style={styles.heroCopy}
        >
          <View
            style={
              styles.heroEyebrow
            }
          >
            <View
              style={
                styles.heroEyebrowDot
              }
            />

            <Text
              style={
                styles.heroEyebrowText
              }
            >
              {isCompleted
                ? "CHAPTER COMPLETE"
                : "CONTINUE LEARNING"}
            </Text>
          </View>

          <Text
            style={styles.heroTitle}
            numberOfLines={2}
          >
            {chapter}
          </Text>

          <Text
            style={
              styles.heroSubtitle
            }
            numberOfLines={1}
          >
            {subject} · Practice Series
          </Text>
        </View>

        <View
          style={
            styles.heroProgress
          }
        >
          <Text
            style={
              styles.heroProgressValue
            }
          >
            {progress}%
          </Text>

          <Text
            style={
              styles.heroProgressLabel
            }
          >
            done
          </Text>
        </View>
      </View>

      {/* STATS */}

      <View
        style={styles.heroStats}
      >
        <View
          style={styles.heroStat}
        >
          <Text
            style={
              styles.heroStatValue
            }
          >
            {completedTests}
          </Text>

          <Text
            style={
              styles.heroStatLabel
            }
          >
            Completed
          </Text>
        </View>

        <View
          style={styles.heroDivider}
        />

        <View
          style={styles.heroStat}
        >
          <Text
            style={
              styles.heroStatValue
            }
          >
            {totalTests}
          </Text>

          <Text
            style={
              styles.heroStatLabel
            }
          >
            Total
          </Text>
        </View>

        <View
          style={styles.heroDivider}
        />

        <View
          style={styles.heroStat}
        >
          <Text
            style={
              styles.heroStatValue
            }
          >
            {inProgressTests}
          </Text>

          <Text
            style={
              styles.heroStatLabel
            }
          >
            In progress
          </Text>
        </View>
      </View>

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
                progress,
                totalTests > 0
                  ? 2
                  : 0
              )}%`,
            },
          ]}
        />
      </View>

      {/* FEATURED TEST */}

      {featuredTest &&
        !activeLocked && (
          <View
            style={
              styles.featuredBox
            }
          >
            <View
              style={
                styles.featuredIcon
              }
            >
              <Ionicons
                name={
                  hasResume
                    ? "play"
                    : "document-text-outline"
                }
                size={17}
                color={
                  colors.brand
                }
              />
            </View>

            <View
              style={
                styles.featuredCopy
              }
            >
              <Text
                style={
                  styles.featuredLabel
                }
              >
                {hasResume
                  ? "CONTINUE"
                  : "NEXT PRACTICE"}
              </Text>

              <Text
                style={
                  styles.featuredTitle
                }
                numberOfLines={1}
              >
                {featuredTest.title}
              </Text>

              <Text
                style={
                  styles.featuredMeta
                }
              >
                {activeLevel.label} ·{" "}
                {featuredTest.durationMinutes ||
                  0}{" "}
                min
              </Text>
            </View>

            {/* FIX: was `disabled={starting}` - the raw `starting` state
                holds the STRING _id of whichever test is loading (or
                null), not a boolean. Passing a string straight into
                `disabled` crashes Android's native bridge with "Value for
                disabled cannot be cast from String to boolean". This now
                compares it to THIS card's test id, same as the line right
                below already correctly does - giving a real boolean. */}
            <TouchableOpacity
              style={
                styles.featuredAction
              }
              activeOpacity={0.8}
              onPress={onStart}
              disabled={starting === featuredTest._id}
            >
              {starting ===
              featuredTest._id ? (
                <ActivityIndicator
                  size="small"
                  color="#fff"
                />
              ) : (
                <Ionicons
                  name={
                    hasResume
                      ? "play"
                      : "arrow-forward"
                  }
                  size={15}
                  color="#fff"
                />
              )}
            </TouchableOpacity>
          </View>
        )}

      {/* LOCKED */}

      {activeLocked && (
        <View
          style={
            styles.heroLocked
          }
        >
          <Ionicons
            name="lock-closed"
            size={14}
            color={colors.slate}
          />

          <Text
            style={
              styles.heroLockedText
            }
          >
            Complete the previous
            level to continue
          </Text>
        </View>
      )}
    </View>
  );
}

/* =========================================================
   TEST CARD
========================================================= */

function PracticeTestCard({
  item,
  index,
  level,
  subscribed,
  starting,
  activeLocked,
  onPress,
}) {
  const isPremiumItem =
    !item.isFree;

  const premiumLocked =
    isPremiumItem &&
    !subscribed;

  const isStarting =
    starting === item._id;

  const completed =
    item.attemptStatus ===
    "completed";

  const inProgress =
    item.attemptStatus ===
    "in_progress";

  return (
    <TouchableOpacity
      style={[
        styles.testCard,
        activeLocked &&
          styles.testCardLocked,
      ]}
      activeOpacity={0.78}
      disabled={isStarting}
      onPress={onPress}
    >
      <View
        style={[
          styles.testAccent,
          {
            backgroundColor:
              level.tint,
          },
        ]}
      />

      <View
        style={
          styles.testNumber
        }
      >
        <Text
          style={
            styles.testNumberText
          }
        >
          {String(
            index + 1
          ).padStart(2, "0")}
        </Text>
      </View>

      <View
        style={
          styles.testContent
        }
      >
        <View
          style={
            styles.testBadgeRow
          }
        >
          {isPremiumItem ? (
            <View
              style={[
                styles.badge,
                styles.premiumBadge,
              ]}
            >
              <Ionicons
                name={
                  premiumLocked
                    ? "lock-closed"
                    : "diamond-outline"
                }
                size={10}
                color={
                  premiumLocked
                    ? colors.warn
                    : colors.success
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      premiumLocked
                        ? colors.warn
                        : colors.success,
                  },
                ]}
              >
                Premium
              </Text>
            </View>
          ) : (
            <View
              style={[
                styles.badge,
                styles.freeBadge,
              ]}
            >
              <Ionicons
                name="checkmark-circle"
                size={10}
                color={
                  colors.success
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      colors.success,
                  },
                ]}
              >
                Free
              </Text>
            </View>
          )}

          {completed && (
            <View
              style={[
                styles.badge,
                styles.scoreBadge,
              ]}
            >
              <Ionicons
                name="checkmark"
                size={10}
                color={
                  colors.brand
                }
              />

              <Text
                style={
                  styles.scoreText
                }
              >
                {item.bestAccuracy ??
                  0}
                %
              </Text>
            </View>
          )}

          {inProgress && (
            <View
              style={[
                styles.badge,
                styles.resumeBadge,
              ]}
            >
              <Ionicons
                name="play"
                size={9}
                color={
                  colors.warn
                }
              />

              <Text
                style={
                  styles.resumeText
                }
              >
                Continue
              </Text>
            </View>
          )}
        </View>

        <Text
          style={
            styles.testTitle
          }
          numberOfLines={1}
        >
          {item.title}
        </Text>

        <View
          style={
            styles.metaRow
          }
        >
          <Ionicons
            name="time-outline"
            size={13}
            color={
              colors.slateSoft
            }
          />

          <Text
            style={
              styles.metaText
            }
          >
            {item.durationMinutes ||
              0}{" "}
            min
          </Text>

          {item.questions?.length >
            0 && (
            <>
              <View
                style={
                  styles.metaDot
                }
              />

              <Ionicons
                name="help-circle-outline"
                size={13}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.metaText
                }
              >
                {
                  item.questions
                    .length
                }{" "}
                Q
              </Text>
            </>
          )}
        </View>
      </View>

      {isStarting ? (
        <View
          style={
            styles.cardLoader
          }
        >
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
        </View>
      ) : (
        <View
          style={[
            styles.cardAction,
            premiumLocked &&
              styles.cardActionPremium,
            activeLocked &&
              styles.cardActionLocked,
          ]}
        >
          <Ionicons
            name={
              activeLocked ||
              premiumLocked
                ? "lock-closed"
                : completed
                ? "refresh"
                : inProgress
                ? "play"
                : "chevron-forward"
            }
            size={15}
            color={
              activeLocked
                ? colors.slateSoft
                : premiumLocked
                ? colors.warn
                : colors.brand
            }
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY
========================================================= */

function EmptyState({
  level,
  locked,
}) {
  if (locked) return null;

  return (
    <View
      style={styles.empty}
    >
      <View
        style={
          styles.emptyIcon
        }
      >
        <Ionicons
          name="document-text-outline"
          size={26}
          color={
            colors.slateSoft
          }
        />
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No {level} tests yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Practice tests for this
        level will appear here
        when added.
      </Text>
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

  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
  },

  loadingText: {
    ...type.small,
    color: colors.slate,
    marginTop: 9,
    fontSize: 13,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  headerText: {
    flex: 1,
  },

  headerTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 20,
  },

  headerSubtitle: {
    ...type.small,
    color: colors.slateSoft,
    marginTop: 1,
    fontSize: 12,
  },

  /* =======================================================
     HERO
  ======================================================= */

  hero: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    padding: 15,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.brand,
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroCopy: {
    flex: 1,
    paddingRight: 12,
  },

  heroEyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
  },

  heroEyebrowDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },

  heroEyebrowText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 0.45,
  },

  heroTitle: {
    ...type.h1,
    color: colors.ink,
    fontSize: 22,
    lineHeight: 27,
  },

  heroSubtitle: {
    ...type.small,
    color: colors.slate,
    marginTop: 3,
    fontSize: 12,
  },

  heroProgress: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brandTint,
    borderWidth: 4,
    borderColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  heroProgressValue: {
    fontSize: 16,
    fontWeight: "900",
    color: colors.brand,
  },

  heroProgressLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: colors.slate,
    marginTop: 0,
  },

  /* =======================================================
     HERO STATS
  ======================================================= */

  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 9,
    paddingHorizontal: 3,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
  },

  heroStat: {
    flex: 1,
    alignItems: "center",
  },

  heroStatValue: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },

  heroStatLabel: {
    fontSize: 9.5,
    color: colors.slateSoft,
    fontWeight: "600",
    marginTop: 2,
  },

  heroDivider: {
    width: 1,
    height: 25,
    backgroundColor: colors.border,
  },

  heroProgressTrack: {
    height: 5,
    backgroundColor: colors.slateLight,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 10,
  },

  heroProgressFill: {
    height: 5,
    backgroundColor: colors.brand,
    borderRadius: 3,
  },

  /* =======================================================
     FEATURED
  ======================================================= */

  featuredBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 11,
    padding: 9,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandLight,
  },

  featuredIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },

  featuredCopy: {
    flex: 1,
    minWidth: 0,
  },

  featuredLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 0.3,
  },

  featuredTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 1,
  },

  featuredMeta: {
    fontSize: 9.5,
    fontWeight: "600",
    color: colors.slateSoft,
    marginTop: 1,
  },

  featuredAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 7,
  },

  heroLocked: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: radius.md,
    backgroundColor: colors.slateLight,
  },

  heroLockedText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.slate,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },

  sectionTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 18,
  },

  sectionSubtitle: {
    ...type.small,
    color: colors.slateSoft,
    marginTop: 2,
    fontSize: 11.5,
  },

  levelProgress: {
    minWidth: 40,
    height: 27,
    paddingHorizontal: 9,
    borderRadius: radius.full,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  levelProgressText: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand,
  },

  /* =======================================================
     LEVELS
  ======================================================= */

  levelRow: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    gap: 7,
    marginBottom: spacing.md,
  },

  levelItem: {
    flex: 1,
    minHeight: 70,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  levelItemActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    ...shadow.brand,
  },

  levelItemLocked: {
    backgroundColor: colors.slateLight,
    opacity: 0.72,
  },

  levelDot: {
    width: 29,
    height: 29,
    borderRadius: 10,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5,
  },

  levelDotActive: {
    backgroundColor:
      "rgba(255,255,255,0.20)",
  },

  levelName: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: "800",
    color: colors.ink,
  },

  levelNameActive: {
    color: "#fff",
  },

  levelNameLocked: {
    color: colors.slateSoft,
  },

  levelCount: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: "600",
    color: colors.slateSoft,
    marginTop: 1,
  },

  levelCountActive: {
    color: "rgba(255,255,255,0.78)",
  },

  /* =======================================================
     LOCKED
  ======================================================= */

  lockedNotice: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.slateLight,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  lockedIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  lockedTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.ink,
  },

  lockedText: {
    fontSize: 10.5,
    color: colors.slate,
    marginTop: 3,
    lineHeight: 15,
  },

  /* =======================================================
     TEST HEADER
  ======================================================= */

  testsHeader: {
    paddingHorizontal: spacing.lg,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  testsTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 18,
  },

  testsSubtitle: {
    ...type.small,
    color: colors.slateSoft,
    marginTop: 2,
    fontSize: 11.5,
  },

  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.successLight,
  },

  readyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.success,
  },

  readyText: {
    fontSize: 9,
    fontWeight: "800",
    color: colors.success,
    letterSpacing: 0.3,
  },

  /* =======================================================
     TEST CARD
  ======================================================= */

  testCard: {
    ...card,
    minHeight: 82,
    marginHorizontal: spacing.lg,
    marginBottom: 9,
    padding: 11,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },

  testCardLocked: {
    opacity: 0.65,
  },

  testAccent: {
    position: "absolute",
    left: 0,
    top: 12,
    bottom: 12,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },

  testNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 3,
    marginRight: 10,
  },

  testNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.brand,
  },

  testContent: {
    flex: 1,
    minWidth: 0,
  },

  testBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 5,
    flexWrap: "wrap",
  },

  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3.5,
    borderRadius: radius.full,
  },

  freeBadge: {
    backgroundColor: colors.successLight,
  },

  premiumBadge: {
    backgroundColor: colors.warnLight,
  },

  scoreBadge: {
    backgroundColor: colors.brandLight,
  },

  resumeBadge: {
    backgroundColor: colors.warnLight,
  },

  badgeText: {
    fontSize: 9.5,
    fontWeight: "800",
  },

  scoreText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.brand,
  },

  resumeText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: colors.warn,
  },

  testTitle: {
    ...type.bodyStrong,
    color: colors.ink,
    fontSize: 14,
    lineHeight: 19,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },

  metaText: {
    fontSize: 10.5,
    color: colors.slateSoft,
    fontWeight: "600",
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginHorizontal: 2,
  },

  cardAction: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  cardActionPremium: {
    backgroundColor: colors.warnLight,
  },

  cardActionLocked: {
    backgroundColor: colors.slateLight,
  },

  cardLoader: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  empty: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: 48,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 11,
  },

  emptyTitle: {
    ...type.h3,
    color: colors.ink,
    fontSize: 17,
  },

  emptyText: {
    ...type.small,
    color: colors.slate,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
});