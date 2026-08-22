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
  useColorScheme,
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

import AppAlert from "../components/AppAlert";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";

import {
  getColors,
  getCard,
  spacing,
  radius,
  type,
  shadow,
} from "../theme/theme";


/* =========================================================
   SCREEN
========================================================= */

export default function ChapterPracticeScreen({
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

  const testCard =
    getCard(isDark);


  const {
    subject,
    chapter,
    currentLevel,
    isCompleted,
  } = route.params || {};

  const { user } =
    useAuth();

  const subscribed =
    isSubscribed(user);


  /* =======================================================
     LEVELS
  ======================================================= */

  const LEVELS = useMemo(
    () => [
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
    ],
    [colors]
  );


  /* =======================================================
     STATE
  ======================================================= */

  const [tests, setTests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(null);


  /* =======================================================
     HIDE NATIVE HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);


  /* =======================================================
     CURRENT LEVEL
  ======================================================= */

  const currentLevelIdx =
    Math.max(
      0,
      LEVELS.findIndex(
        (level) =>
          level.key ===
          currentLevel
      )
    );


  const [activeIdx, setActiveIdx] =
    useState(
      currentLevelIdx
    );


  /* =======================================================
     LOAD TESTS
  ======================================================= */

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            `/tests/practice-series/${encodeURIComponent(
              subject || ""
            )}/${encodeURIComponent(
              chapter || ""
            )}`
          );

        setTests(
          res.data?.tests || []
        );
      } catch (err) {
        console.log(
          "ChapterPracticeScreen load error:",
          err
        );

        setTests([]);
      } finally {
        setLoading(false);
      }
    }, [
      subject,
      chapter,
    ]);


  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );


  /* =======================================================
     START TEST
  ======================================================= */

  async function startTest(test) {
    if (!test?._id) {
      return;
    }

    const premiumLocked =
      !test.isFree &&
      !subscribed;

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

    setStarting(
      test._id
    );

    try {
      const res =
        await api.get(
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

  const counts =
    useMemo(() => {
      const result = {};

      LEVELS.forEach(
        (level) => {
          result[level.key] = 0;
        }
      );

      tests.forEach(
        (test) => {
          if (
            Object.prototype.hasOwnProperty.call(
              result,
              test.difficultyLevel
            )
          ) {
            result[
              test.difficultyLevel
            ] += 1;
          }
        }
      );

      return result;
    }, [tests, LEVELS]);


  /* =======================================================
     PROGRESS
  ======================================================= */

  const completedTests =
    useMemo(
      () =>
        tests.filter(
          (test) =>
            test.attemptStatus ===
            "completed"
        ).length,
      [tests]
    );


  const inProgressTests =
    useMemo(
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
    LEVELS[activeIdx] ||
    LEVELS[0];


  const activeLocked =
    !isCompleted &&
    activeIdx >
      currentLevelIdx;


  const activeTests =
    useMemo(
      () =>
        tests.filter(
          (test) =>
            test.difficultyLevel ===
            activeLevel.key
        ),
      [
        tests,
        activeLevel.key,
      ]
    );


  /* =======================================================
     FEATURED TEST
  ======================================================= */

  const featuredTest =
    useMemo(() => {
      if (
        !activeTests.length
      ) {
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
            backgroundColor:
              colors.bg,

            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={[
            styles.loadingIcon,
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
            size={24}
            color={
              colors.brand
            }
          />
        </View>

        <ActivityIndicator
          size="small"
          color={
            colors.brand
          }
        />

        <Text
          style={[
            styles.loadingText,
            {
              color:
                colors.slate,
            },
          ]}
        >
          Loading practice...
        </Text>
      </View>
    );
  }


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
      <FlatList
        data={activeTests}
        keyExtractor={(item) =>
          item._id
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl +
            insets.bottom,
        }}


        /* =================================================
           HEADER
        ================================================= */

        ListHeaderComponent={
          <>
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
                style={[
                  styles.backButton,
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
                  color={
                    colors.ink
                  }
                />
              </TouchableOpacity>


              <View
                style={
                  styles.headerText
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
                  Practice
                </Text>

                <Text
                  style={[
                    styles.headerSubtitle,
                    {
                      color:
                        colors.slateSoft,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {subject}
                </Text>
              </View>


              <View
                style={[
                  styles.headerBadge,
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
                    styles.headerBadgeNumber,
                    {
                      color:
                        colors.brand,
                    },
                  ]}
                >
                  {tests.length}
                </Text>

                <Text
                  style={[
                    styles.headerBadgeLabel,
                    {
                      color:
                        colors.slate,
                    },
                  ]}
                >
                  TESTS
                </Text>
              </View>

            </View>


            {/* =================================================
                HERO
            ================================================= */}

            <PracticeHero
              chapter={
                chapter
              }
              subject={
                subject
              }
              activeLevel={
                activeLevel
              }
              isCompleted={
                isCompleted
              }
              progress={
                progress
              }
              completedTests={
                completedTests
              }
              totalTests={
                tests.length
              }
              inProgressTests={
                inProgressTests
              }
              featuredTest={
                featuredTest
              }
              activeLocked={
                activeLocked
              }
              starting={
                starting
              }
              colors={
                colors
              }
              onStart={() => {
                if (
                  featuredTest
                ) {
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
                  Practice Levels
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
                  Clear each level to move
                  ahead
                </Text>
              </View>

              <View
                style={[
                  styles.levelProgress,
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
                    styles.levelProgressText,
                    {
                      color:
                        colors.brand,
                    },
                  ]}
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
              style={
                styles.levelRow
              }
            >
              {LEVELS.map(
                (
                  level,
                  index
                ) => {
                  const locked =
                    !isCompleted &&
                    index >
                      currentLevelIdx;

                  const completed =
                    isCompleted ||
                    index <
                      currentLevelIdx;

                  const active =
                    activeIdx ===
                    index;

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
                        {
                          backgroundColor:
                            colors.surface,

                          borderColor:
                            colors.border,
                        },

                        active && {
                          backgroundColor:
                            colors.brand,

                          borderColor:
                            colors.brand,
                        },

                        locked && {
                          backgroundColor:
                            colors.slateLight,

                          opacity: 0.72,
                        },
                      ]}
                      activeOpacity={
                        0.78
                      }
                      onPress={() =>
                        setActiveIdx(
                          index
                        )
                      }
                    >
                      <View
                        style={[
                          styles.levelDot,
                          {
                            backgroundColor:
                              active
                                ? "rgba(255,255,255,0.18)"
                                : colors.brandTint,
                          },
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
                              ? "#FFFFFF"
                              : locked
                              ? colors.slateSoft
                              : level.tint
                          }
                        />
                      </View>

                      <Text
                        style={[
                          styles.levelName,
                          {
                            color:
                              colors.ink,
                          },
                          active && {
                            color:
                              "#FFFFFF",
                          },
                          locked && {
                            color:
                              colors.slateSoft,
                          },
                        ]}
                      >
                        {
                          level.label
                        }
                      </Text>

                      <Text
                        style={[
                          styles.levelCount,
                          {
                            color:
                              colors.slateSoft,
                          },
                          active && {
                            color:
                              "rgba(255,255,255,0.78)",
                          },
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
                style={[
                  styles.lockedNotice,
                  {
                    backgroundColor:
                      colors.slateLight,

                    borderColor:
                      colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.lockedIcon,
                    {
                      backgroundColor:
                        colors.surface,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed"
                    size={15}
                    color={
                      colors.slate
                    }
                  />
                </View>

                <View
                  style={
                    styles.lockedCopy
                  }
                >
                  <Text
                    style={[
                      styles.lockedTitle,
                      {
                        color:
                          colors.ink,
                      },
                    ]}
                  >
                    {activeLevel.label}{" "}
                    locked
                  </Text>

                  <Text
                    style={[
                      styles.lockedText,
                      {
                        color:
                          colors.slate,
                      },
                    ]}
                  >
                    Complete a{" "}
                    {
                      LEVELS[
                        activeIdx -
                          1
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
              <View
                style={
                  styles.testsCopy
                }
              >
                <Text
                  style={[
                    styles.testsTitle,
                    {
                      color:
                        colors.ink,
                    },
                  ]}
                >
                  {activeLevel.label} Tests
                </Text>

                <Text
                  style={[
                    styles.testsSubtitle,
                    {
                      color:
                        colors.slateSoft,
                    },
                  ]}
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
                    style={[
                      styles.readyBadge,
                      {
                        backgroundColor:
                          colors.successLight,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.readyDot,
                        {
                          backgroundColor:
                            colors.success,
                        },
                      ]}
                    />

                    <Text
                      style={[
                        styles.readyText,
                        {
                          color:
                            colors.success,
                        },
                      ]}
                    >
                      READY
                    </Text>
                  </View>
                )}
            </View>
          </>
        }


        /* =================================================
           EMPTY
        ================================================= */

        ListEmptyComponent={
          <EmptyState
            level={
              activeLevel.label
            }
            locked={
              activeLocked
            }
            colors={
              colors
            }
          />
        }


        /* =================================================
           TESTS
        ================================================= */

        renderItem={({
          item,
          index,
        }) => (
          <PracticeTestCard
            item={
              item
            }
            index={
              index
            }
            level={
              activeLevel
            }
            subscribed={
              subscribed
            }
            starting={
              starting
            }
            activeLocked={
              activeLocked
            }
            colors={
              colors
            }
            testCard={
              testCard
            }
            onPress={() => {
              if (
                activeLocked
              ) {
                AppAlert.alert(
                  "Level locked",
                  `Complete a ${
                    LEVELS[
                      activeIdx -
                        1
                    ]?.label ||
                    "previous"
                  } test first.`
                );

                return;
              }

              startTest(
                item
              );
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
  colors,
  onStart,
}) {
  const hasResume =
    featuredTest?.attemptStatus ===
    "in_progress";

  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor:
            colors.surface,

          borderColor:
            colors.border,

          shadowColor:
            colors.brand,
        },
      ]}
    >

      {/* =================================================
          TOP
      ================================================= */}

      <View
        style={
          styles.heroTop
        }
      >

        <View
          style={
            styles.heroCopy
          }
        >

          <View
            style={
              styles.heroEyebrow
            }
          >
            <View
              style={[
                styles.heroEyebrowDot,
                {
                  backgroundColor:
                    isCompleted
                      ? colors.success
                      : colors.brand,
                },
              ]}
            />

            <Text
              style={[
                styles.heroEyebrowText,
                {
                  color:
                    isCompleted
                      ? colors.success
                      : colors.brand,
                },
              ]}
            >
              {isCompleted
                ? "CHAPTER COMPLETE"
                : "CONTINUE LEARNING"}
            </Text>
          </View>


          <Text
            style={[
              styles.heroTitle,
              {
                color:
                  colors.ink,
              },
            ]}
            numberOfLines={2}
          >
            {chapter}
          </Text>


          <Text
            style={[
              styles.heroSubtitle,
              {
                color:
                  colors.slate,
              },
            ]}
            numberOfLines={1}
          >
            {subject} · Practice Series
          </Text>

        </View>


        {/* PROGRESS */}

        <View
          style={[
            styles.heroProgress,
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
              styles.heroProgressValue,
              {
                color:
                  colors.brand,
              },
            ]}
          >
            {progress}%
          </Text>

          <Text
            style={[
              styles.heroProgressLabel,
              {
                color:
                  colors.slate,
              },
            ]}
          >
            done
          </Text>
        </View>

      </View>


      {/* =================================================
          STATS
      ================================================= */}

      <View
        style={[
          styles.heroStats,
          {
            backgroundColor:
              colors.bg,
          },
        ]}
      >

        <View
          style={
            styles.heroStat
          }
        >
          <Text
            style={[
              styles.heroStatValue,
              {
                color:
                  colors.ink,
              },
            ]}
          >
            {completedTests}
          </Text>

          <Text
            style={[
              styles.heroStatLabel,
              {
                color:
                  colors.slateSoft,
              },
            ]}
          >
            Completed
          </Text>
        </View>


        <View
          style={[
            styles.heroDivider,
            {
              backgroundColor:
                colors.border,
            },
          ]}
        />


        <View
          style={
            styles.heroStat
          }
        >
          <Text
            style={[
              styles.heroStatValue,
              {
                color:
                  colors.ink,
              },
            ]}
          >
            {totalTests}
          </Text>

          <Text
            style={[
              styles.heroStatLabel,
              {
                color:
                  colors.slateSoft,
              },
            ]}
          >
            Total
          </Text>
        </View>


        <View
          style={[
            styles.heroDivider,
            {
              backgroundColor:
                colors.border,
            },
          ]}
        />


        <View
          style={
            styles.heroStat
          }
        >
          <Text
            style={[
              styles.heroStatValue,
              {
                color:
                  colors.ink,
              },
            ]}
          >
            {inProgressTests}
          </Text>

          <Text
            style={[
              styles.heroStatLabel,
              {
                color:
                  colors.slateSoft,
              },
            ]}
          >
            In progress
          </Text>
        </View>

      </View>


      {/* =================================================
          PROGRESS BAR
      ================================================= */}

      <View
        style={[
          styles.heroProgressTrack,
          {
            backgroundColor:
              colors.slateLight,
          },
        ]}
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

              backgroundColor:
                isCompleted
                  ? colors.success
                  : colors.brand,
            },
          ]}
        />
      </View>


      {/* =================================================
          FEATURED TEST
      ================================================= */}

      {featuredTest &&
        !activeLocked && (
          <View
            style={[
              styles.featuredBox,
              {
                backgroundColor:
                  colors.brandTint,

                borderColor:
                  colors.brandLight,
              },
            ]}
          >

            <View
              style={[
                styles.featuredIcon,
                {
                  backgroundColor:
                    colors.surface,
                },
              ]}
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
                style={[
                  styles.featuredLabel,
                  {
                    color:
                      colors.brand,
                  },
                ]}
              >
                {hasResume
                  ? "CONTINUE"
                  : "NEXT PRACTICE"}
              </Text>

              <Text
                style={[
                  styles.featuredTitle,
                  {
                    color:
                      colors.ink,
                  },
                ]}
                numberOfLines={1}
              >
                {featuredTest.title}
              </Text>

              <Text
                style={[
                  styles.featuredMeta,
                  {
                    color:
                      colors.slateSoft,
                  },
                ]}
              >
                {activeLevel.label} ·{" "}
                {featuredTest.durationMinutes ||
                  0}{" "}
                min
              </Text>
            </View>


            {/* IMPORTANT:
                starting contains an ID string.
                disabled MUST receive boolean.
            */}

            <TouchableOpacity
              style={[
                styles.featuredAction,
                {
                  backgroundColor:
                    colors.brand,
                },
              ]}
              activeOpacity={0.8}
              onPress={onStart}
              disabled={
                starting ===
                featuredTest._id
              }
            >
              {starting ===
              featuredTest._id ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <Ionicons
                  name={
                    hasResume
                      ? "play"
                      : "arrow-forward"
                  }
                  size={15}
                  color="#FFFFFF"
                />
              )}
            </TouchableOpacity>

          </View>
        )}


      {/* =================================================
          LOCKED
      ================================================= */}

      {activeLocked && (
        <View
          style={[
            styles.heroLocked,
            {
              backgroundColor:
                colors.slateLight,
            },
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={14}
            color={
              colors.slate
            }
          />

          <Text
            style={[
              styles.heroLockedText,
              {
                color:
                  colors.slate,
              },
            ]}
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
  colors,
  testCard,
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
        testCard,
        styles.testCard,
        {
          borderColor:
            colors.border,
        },

        activeLocked && {
          opacity: 0.62,
        },
      ]}
      activeOpacity={0.78}
      disabled={
        isStarting
      }
      onPress={
        onPress
      }
    >

      {/* ACCENT */}

      <View
        style={[
          styles.testAccent,
          {
            backgroundColor:
              level.tint,
          },
        ]}
      />


      {/* NUMBER */}

      <View
        style={[
          styles.testNumber,
          {
            backgroundColor:
              colors.brandTint,
          },
        ]}
      >
        <Text
          style={[
            styles.testNumberText,
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
      </View>


      {/* CONTENT */}

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
                {
                  backgroundColor:
                    premiumLocked
                      ? colors.warnLight
                      : colors.successLight,
                },
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
                {
                  backgroundColor:
                    colors.successLight,
                },
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
                {
                  backgroundColor:
                    colors.brandTint,
                },
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
                style={[
                  styles.scoreText,
                  {
                    color:
                      colors.brand,
                  },
                ]}
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
                {
                  backgroundColor:
                    colors.warnLight,
                },
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
                style={[
                  styles.resumeText,
                  {
                    color:
                      colors.warn,
                  },
                ]}
              >
                Continue
              </Text>
            </View>
          )}

        </View>


        <Text
          style={[
            styles.testTitle,
            {
              color:
                colors.ink,
            },
          ]}
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
            style={[
              styles.metaText,
              {
                color:
                  colors.slateSoft,
              },
            ]}
          >
            {item.durationMinutes ||
              0}{" "}
            min
          </Text>


          {item.questions?.length >
            0 && (
            <>
              <View
                style={[
                  styles.metaDot,
                  {
                    backgroundColor:
                      colors.border,
                  },
                ]}
              />

              <Ionicons
                name="help-circle-outline"
                size={13}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={[
                  styles.metaText,
                  {
                    color:
                      colors.slateSoft,
                  },
                ]}
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


      {/* ACTION */}

      {isStarting ? (
        <View
          style={
            styles.cardLoader
          }
        >
          <ActivityIndicator
            size="small"
            color={
              colors.brand
            }
          />
        </View>
      ) : (
        <View
          style={[
            styles.cardAction,
            {
              backgroundColor:
                activeLocked
                  ? colors.slateLight
                  : premiumLocked
                  ? colors.warnLight
                  : colors.brandTint,
            },
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
  colors,
}) {
  if (locked) {
    return null;
  }

  return (
    <View
      style={
        styles.empty
      }
    >

      <View
        style={[
          styles.emptyIcon,
          {
            backgroundColor:
              colors.slateLight,
          },
        ]}
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
        style={[
          styles.emptyTitle,
          {
            color:
              colors.ink,
          },
        ]}
      >
        No {level} tests yet
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

const styles =
  StyleSheet.create({

    /* =====================================================
       GENERAL
    ===================================================== */

    container: {
      flex: 1,
    },

    loadingScreen: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingIcon: {
      width: 58,
      height: 58,
      borderRadius: 18,
      borderWidth: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 15,
    },

    loadingText: {
      ...type.small,
      marginTop: 9,
      fontSize: 12.5,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      paddingHorizontal:
        spacing.lg,

      paddingBottom:
        spacing.md,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 10,
    },

    backButton: {
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

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      ...type.h3,

      fontSize: 20,

      lineHeight: 24,
    },

    headerSubtitle: {
      ...type.small,

      fontSize: 11.5,

      lineHeight: 16,

      marginTop: 1,
    },

    headerBadge: {
      minWidth: 52,

      height: 40,

      borderRadius: 13,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerBadgeNumber: {
      fontSize: 13,

      lineHeight: 15,

      fontWeight:
        "800",
    },

    headerBadgeLabel: {
      fontSize: 6.5,

      lineHeight: 9,

      fontWeight:
        "800",

      letterSpacing:
        0.25,

      marginTop: 1,
    },


    /* =====================================================
       HERO
    ===================================================== */

    hero: {
      marginHorizontal:
        spacing.lg,

      marginBottom:
        spacing.lg,

      padding: 15,

      borderRadius:
        radius.xl,

      borderWidth: 1,

      ...shadow.brand,
    },

    heroTop: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    heroCopy: {
      flex: 1,

      minWidth: 0,

      paddingRight: 12,
    },

    heroEyebrow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      marginBottom: 5,
    },

    heroEyebrowDot: {
      width: 7,

      height: 7,

      borderRadius: 4,
    },

    heroEyebrowText: {
      fontSize: 9,

      lineHeight: 12,

      fontWeight:
        "800",

      letterSpacing:
        0.45,
    },

    heroTitle: {
      ...type.h1,

      fontSize: 22,

      lineHeight: 27,

      letterSpacing:
        -0.45,
    },

    heroSubtitle: {
      ...type.small,

      fontSize: 12,

      lineHeight: 17,

      marginTop: 3,
    },

    heroProgress: {
      width: 68,

      height: 68,

      borderRadius: 34,

      borderWidth: 4,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    heroProgressValue: {
      fontSize: 16,

      lineHeight: 19,

      fontWeight:
        "900",
    },

    heroProgressLabel: {
      fontSize: 9,

      lineHeight: 12,

      fontWeight:
        "600",

      marginTop: 0,
    },


    /* =====================================================
       HERO STATS
    ===================================================== */

    heroStats: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 12,

      paddingVertical: 9,

      paddingHorizontal: 3,

      borderRadius:
        radius.md,
    },

    heroStat: {
      flex: 1,

      alignItems:
        "center",
    },

    heroStatValue: {
      fontSize: 16,

      lineHeight: 19,

      fontWeight:
        "800",
    },

    heroStatLabel: {
      fontSize: 9.5,

      lineHeight: 13,

      fontWeight:
        "600",

      marginTop: 2,
    },

    heroDivider: {
      width: 1,

      height: 25,
    },

    heroProgressTrack: {
      height: 5,

      borderRadius: 3,

      overflow:
        "hidden",

      marginTop: 10,
    },

    heroProgressFill: {
      height: 5,

      borderRadius: 3,
    },


    /* =====================================================
       FEATURED
    ===================================================== */

    featuredBox: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 11,

      padding: 9,

      borderRadius:
        radius.md,

      borderWidth: 1,
    },

    featuredIcon: {
      width: 34,

      height: 34,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginRight: 8,
    },

    featuredCopy: {
      flex: 1,

      minWidth: 0,
    },

    featuredLabel: {
      fontSize: 8.5,

      lineHeight: 11,

      fontWeight:
        "800",

      letterSpacing:
        0.3,
    },

    featuredTitle: {
      fontSize: 12.5,

      lineHeight: 17,

      fontWeight:
        "800",

      marginTop: 1,
    },

    featuredMeta: {
      fontSize: 9.5,

      lineHeight: 13,

      fontWeight:
        "600",

      marginTop: 1,
    },

    featuredAction: {
      width: 34,

      height: 34,

      borderRadius: 17,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 7,
    },

    heroLocked: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,

      marginTop: 10,

      paddingVertical: 8,

      borderRadius:
        radius.md,
    },

    heroLockedText: {
      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        "700",
    },


    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      paddingHorizontal:
        spacing.lg,

      flexDirection:
        "row",

      alignItems:
        "center",

      marginBottom: 10,
    },

    sectionCopy: {
      flex: 1,

      minWidth: 0,

      paddingRight: 10,
    },

    sectionTitle: {
      ...type.h3,

      fontSize: 18,

      lineHeight: 22,
    },

    sectionSubtitle: {
      ...type.small,

      fontSize: 11.5,

      lineHeight: 16,

      marginTop: 2,
    },

    levelProgress: {
      minWidth: 42,

      height: 29,

      paddingHorizontal: 9,

      borderRadius:
        radius.full,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    levelProgressText: {
      fontSize: 11,

      lineHeight: 14,

      fontWeight:
        "800",
    },


    /* =====================================================
       LEVEL SELECTOR
    ===================================================== */

    levelRow: {
      paddingHorizontal:
        spacing.lg,

      flexDirection:
        "row",

      gap: 7,

      marginBottom:
        spacing.md,
    },

    levelItem: {
      flex: 1,

      minHeight: 72,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      paddingVertical: 8,
    },

    levelDot: {
      width: 29,

      height: 29,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 5,
    },

    levelName: {
      fontSize: 12.5,

      lineHeight: 17,

      fontWeight:
        "800",
    },

    levelCount: {
      fontSize: 9.5,

      lineHeight: 13,

      fontWeight:
        "600",

      marginTop: 1,
    },


    /* =====================================================
       LOCK NOTICE
    ===================================================== */

    lockedNotice: {
      marginHorizontal:
        spacing.lg,

      marginBottom:
        spacing.md,

      padding: 10,

      borderRadius:
        radius.md,

      borderWidth: 1,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
    },

    lockedIcon: {
      width: 32,

      height: 32,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    lockedCopy: {
      flex: 1,

      minWidth: 0,
    },

    lockedTitle: {
      fontSize: 12,

      lineHeight: 16,

      fontWeight:
        "800",
    },

    lockedText: {
      fontSize: 10.5,

      lineHeight: 15,

      marginTop: 3,
    },


    /* =====================================================
       TEST HEADER
    ===================================================== */

    testsHeader: {
      paddingHorizontal:
        spacing.lg,

      marginBottom: 10,

      flexDirection:
        "row",

      alignItems:
        "center",
    },

    testsCopy: {
      flex: 1,

      minWidth: 0,

      paddingRight: 8,
    },

    testsTitle: {
      ...type.h3,

      fontSize: 18,

      lineHeight: 22,
    },

    testsSubtitle: {
      ...type.small,

      fontSize: 11,

      lineHeight: 15,

      marginTop: 2,
    },

    readyBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,

      paddingHorizontal: 9,

      paddingVertical: 6,

      borderRadius:
        radius.full,
    },

    readyDot: {
      width: 5,

      height: 5,

      borderRadius: 3,
    },

    readyText: {
      fontSize: 9,

      lineHeight: 12,

      fontWeight:
        "800",

      letterSpacing:
        0.3,
    },


    /* =====================================================
       TEST CARD
    ===================================================== */

    testCard: {
      minHeight: 82,

      marginHorizontal:
        spacing.lg,

      marginBottom: 9,

      padding: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      overflow:
        "hidden",
    },

    testAccent: {
      position:
        "absolute",

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

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 3,

      marginRight: 10,
    },

    testNumberText: {
      fontSize: 12,

      lineHeight: 15,

      fontWeight:
        "800",
    },

    testContent: {
      flex: 1,

      minWidth: 0,
    },

    testBadgeRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      marginBottom: 5,

      flexWrap:
        "wrap",
    },

    badge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 3,

      paddingHorizontal: 7,

      paddingVertical: 3.5,

      borderRadius:
        radius.full,
    },

    badgeText: {
      fontSize: 9.5,

      lineHeight: 12,

      fontWeight:
        "800",
    },

    scoreText: {
      fontSize: 9.5,

      lineHeight: 12,

      fontWeight:
        "800",
    },

    resumeText: {
      fontSize: 9.5,

      lineHeight: 12,

      fontWeight:
        "800",
    },

    testTitle: {
      ...type.bodyStrong,

      fontSize: 14,

      lineHeight: 19,
    },

    metaRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,

      marginTop: 5,
    },

    metaText: {
      fontSize: 10.5,

      lineHeight: 14,

      fontWeight:
        "600",
    },

    metaDot: {
      width: 3,

      height: 3,

      borderRadius: 2,

      marginHorizontal: 2,
    },

    cardAction: {
      width: 34,

      height: 34,

      borderRadius: 17,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 8,
    },

    cardLoader: {
      width: 34,

      height: 34,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 8,
    },


    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      alignItems:
        "center",

      paddingHorizontal:
        spacing.xl,

      paddingVertical: 48,
    },

    emptyIcon: {
      width: 60,

      height: 60,

      borderRadius: 19,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 12,
    },

    emptyTitle: {
      ...type.h3,

      fontSize: 17,

      lineHeight: 22,
    },

    emptyText: {
      ...type.small,

      fontSize: 12,

      lineHeight: 18,

      textAlign:
        "center",

      marginTop: 5,

      maxWidth: 285,
    },

  });