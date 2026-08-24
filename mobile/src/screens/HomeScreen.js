import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
  Animated,
  Easing,
} from "react-native";

import AppAlert from "../components/AppAlert";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";

import {
  colors,
  spacing,
  radius,
  type,
  card,
} from "../theme/theme";

const { width: SCREEN_WIDTH } =
  Dimensions.get("window");

/* =========================================================
   LOGO
========================================================= */

const RANKVEER_LOGO = require(
  "../../assets/brand-logo.png"
);

/* =========================================================
   CAROUSEL DATA
========================================================= */

const HOME_CAROUSEL_DATA = [
  {
    id: "mock-tests",
    title: "Mock Tests",
    description:
      "Practice with full-length papers designed like the real exam.",
    icon: "document-text",
    secondaryIcon: "timer-outline",
    background: "#F2F3FF",
    primary: "#5B5FEF",
    statOne: "Full Length",
    statTwo: "Real Pattern",
    action: "MockTab",
  },

  {
    id: "subject-practice",
    title: "Subject Practice",
    description:
      "Strengthen every subject with focused chapter-wise practice.",
    icon: "book",
    secondaryIcon: "checkmark-circle-outline",
    background: "#ECFDF5",
    primary: "#10B981",
    statOne: "Chapter Wise",
    statTwo: "Smart Practice",
    action: "PracticeTab",
  },

  {
    id: "previous-papers",
    title: "Previous Year Papers",
    description:
      "Solve real questions asked in previous competitive exams.",
    icon: "archive",
    secondaryIcon: "time-outline",
    background: "#FFF8E7",
    primary: "#F59E0B",
    statOne: "Real Questions",
    statTwo: "Exam Pattern",
    action: "PyqTab",
  },

  {
    id: "live-exams",
    title: "Live Exams",
    description:
      "Compete with other aspirants and test your real exam readiness.",
    icon: "radio",
    secondaryIcon: "people-outline",
    background: "#FDF2F8",
    primary: "#EC4899",
    statOne: "Live Ranking",
    statTwo: "Compete",
    action: "LiveTab",
  },

  {
    id: "analytics",
    title: "Track Your Performance",
    description:
      "Understand your strengths, weaknesses and improve faster.",
    icon: "stats-chart",
    secondaryIcon: "trending-up-outline",
    background: "#EFF6FF",
    primary: "#3B82F6",
    statOne: "Analytics",
    statTwo: "Progress",
    action: "Analysis",
  },
];

/* =========================================================
   HOME SCREEN
========================================================= */

export default function HomeScreen({
  navigation,
}) {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loadingTest, setLoadingTest] =
    useState(false);

  const [upcomingLive, setUpcomingLive] =
    useState(null);

  const [subjects, setSubjects] =
    useState([]);

  const [refreshing, setRefreshing] =
    useState(false);

  /* =======================================================
     GREETING EMOJI ANIMATION
  ======================================================= */

  const waveAnim = useRef(
    new Animated.Value(0)
  ).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(300),

      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      Animated.timing(waveAnim, {
        toValue: -1,
        duration: 180,
        easing: Easing.inOut(
          Easing.ease
        ),
        useNativeDriver: true,
      }),

      Animated.timing(waveAnim, {
        toValue: 0.65,
        duration: 140,
        easing: Easing.inOut(
          Easing.ease
        ),
        useNativeDriver: true,
      }),

      Animated.timing(waveAnim, {
        toValue: -0.45,
        duration: 120,
        easing: Easing.inOut(
          Easing.ease
        ),
        useNativeDriver: true,
      }),

      Animated.timing(waveAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [waveAnim]);

  /* =======================================================
     LOAD DATA
  ======================================================= */

  const loadData = useCallback(
    async () => {
      try {
        const [
          liveRes,
          subjectsRes,
        ] = await Promise.allSettled([
          api.get(
            "/exams/live/upcoming"
          ),
          api.get("/subjects/my"),
        ]);

        if (
          liveRes.status ===
          "fulfilled"
        ) {
          setUpcomingLive(
            liveRes.value.data
              ?.exams?.[0] ||
              liveRes.value.data
                ?.tests?.[0] ||
              null
          );
        }

        if (
          subjectsRes.status ===
          "fulfilled"
        ) {
          setSubjects(
            (
              subjectsRes.value.data
                ?.subjects || []
            ).slice(0, 3)
          );
        }
      } catch (err) {
        console.log(
          "Home data error:",
          err
        );
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  /* =======================================================
     TODAY TEST
  ======================================================= */

  async function startTodayTest() {
    setLoadingTest(true);

    try {
      const res =
        await api.get(
          "/tests/today"
        );

      navigation.navigate(
        "TestTaking",
        {
          testId:
            res.data.test._id,
        }
      );
    } catch (err) {
      if (
        err.response?.data?.code ===
        "SUBSCRIPTION_REQUIRED"
      ) {
        AppAlert.alert(
          "Free trial used up",
          err.response.data.message,
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
          err.response?.data
            ?.message ||
            "Couldn't load the test"
        );
      }
    } finally {
      setLoadingTest(false);
    }
  }

  /* =======================================================
     REFRESH
  ======================================================= */

  async function onRefresh() {
    setRefreshing(true);

    await loadData();

    setRefreshing(false);
  }

  /* =======================================================
     USER
  ======================================================= */

  const isPremium =
    isSubscribed(user);

  const firstName =
    user?.name?.split(" ")[0] ||
    "Aspirant";

  /* =======================================================
     ANIMATED GREETING TRANSFORM
  ======================================================= */

  const emojiRotate =
    waveAnim.interpolate({
      inputRange: [-1, 1],
      outputRange: [
        "-24deg",
        "24deg",
      ],
    });

  const emojiScale =
    waveAnim.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [
        0.92,
        1,
        1.08,
      ],
    });

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom:
          spacing.xxl +
          insets.bottom,
      }}
      showsVerticalScrollIndicator={
        false
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand}
        />
      }
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
                10
              ),
          },
        ]}
      >
        {/* LOGO */}

        <View
          style={styles.brandArea}
        >
          <Image
            source={RANKVEER_LOGO}
            style={styles.brandLogo}
            resizeMode="contain"
          />
        </View>

        {/* ACTIONS */}

        <View
          style={
            styles.headerActions
          }
        >
          <TouchableOpacity
            style={
              styles.headerIconButton
            }
            activeOpacity={0.72}
            hitSlop={8}
            onPress={() =>
              navigation.navigate(
                "Profile"
              )
            }
          >
            <Ionicons
              name="person-outline"
              size={20}
              color={colors.ink}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={
              styles.headerIconButton
            }
            activeOpacity={0.72}
            hitSlop={8}
            onPress={() =>
              navigation.navigate(
                "Notifications"
              )
            }
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.ink}
            />

            <View
              style={
                styles.notificationDot
              }
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* =================================================
          GREETING
      ================================================= */}

      <View
        style={
          styles.greetingSection
        }
      >
        <View
          style={
            styles.greetingRow
          }
        >
          <Text
            style={styles.greeting}
            numberOfLines={1}
          >
            Hi, {firstName}
          </Text>

          <Animated.Text
            style={[
              styles.greetingEmoji,
              {
                transform: [
                  {
                    rotate:
                      emojiRotate,
                  },
                  {
                    scale:
                      emojiScale,
                  },
                ],
              },
            ]}
          >
            👋
          </Animated.Text>
        </View>

        <Text
          style={
            styles.greetingSub
          }
        >
          Ready to improve your
          score today?
        </Text>
      </View>

      {/* =================================================
          PRACTICE TODAY
      ================================================= */}

      <View
        style={styles.section}
      >
        <View
          style={styles.hero}
        >
          <View
            style={
              styles.heroDecorationOne
            }
          />

          <View
            style={
              styles.heroDecorationTwo
            }
          />

          {loadingTest ? (
            <View
              style={
                styles.heroLoading
              }
            >
              <ActivityIndicator
                color={
                  colors.heroAccent
                }
                size="large"
              />

              <Text
                style={
                  styles.heroLoadingText
                }
              >
                Preparing your test…
              </Text>
            </View>
          ) : (
            <View
              style={styles.heroRow}
            >
              <View
                style={
                  styles.heroContent
                }
              >
                <View
                  style={
                    styles.heroEyebrow
                  }
                >
                  <Ionicons
                    name="flash"
                    size={11}
                    color={
                      colors.heroAccent
                    }
                  />

                  <Text
                    style={
                      styles.heroEyebrowText
                    }
                  >
                    DAILY PRACTICE
                  </Text>
                </View>

                <Text
                  style={
                    styles.heroTitle
                  }
                >
                  Practice Today
                </Text>

                <Text
                  style={
                    styles.heroSub
                  }
                >
                  Improve your score
                  with a focused test
                </Text>

                <TouchableOpacity
                  style={
                    styles.heroButton
                  }
                  onPress={
                    startTodayTest
                  }
                  activeOpacity={0.85}
                >
                  <Text
                    style={
                      styles.heroButtonText
                    }
                  >
                    Start Practice
                  </Text>

                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              <View
                style={
                  styles.targetWrap
                }
              >
                <View
                  style={
                    styles.targetRingOuter
                  }
                >
                  <View
                    style={
                      styles.targetRingMid
                    }
                  >
                    <View
                      style={
                        styles.targetRingInner
                      }
                    />
                  </View>
                </View>

                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={
                    colors.heroAccent
                  }
                  style={
                    styles.targetArrow
                  }
                />
              </View>
            </View>
          )}
        </View>
      </View>

      {/* =================================================
          CAROUSEL
      ================================================= */}

      <View
        style={styles.section}
      >
        <HomeCarousel
          navigation={navigation}
        />
      </View>

      {/* =================================================
          CONTINUE LEARNING
      ================================================= */}

      {subjects.length > 0 && (
        <View
          style={styles.section}
        >
          <View
            style={
              styles.sectionHead
            }
          >
            <Text
              style={
                styles.sectionTitleNoMargin
              }
            >
              Continue Learning
            </Text>

            <TouchableOpacity
              onPress={() =>
                navigation.navigate(
                  "PracticeTab"
                )
              }
              activeOpacity={0.7}
            >
              <Text
                style={
                  styles.viewAll
                }
              >
                View All
              </Text>
            </TouchableOpacity>
          </View>

          {subjects
            .slice(0, 1)
            .map((subj) => {
              const progress =
                subj.totalChapters
                  ? Math.max(
                      Math.min(
                        (subj.completedCount /
                          subj.totalChapters) *
                          100,
                        100
                      ),
                      3
                    )
                  : 3;

              return (
                <TouchableOpacity
                  key={subj._id}
                  style={
                    styles.learnCard
                  }
                  activeOpacity={0.75}
                  onPress={() =>
                    navigation.navigate(
                      "PracticeTab",
                      {
                        screen:
                          "ChapterList",
                        params: {
                          subject:
                            subj,
                        },
                      }
                    )
                  }
                >
                  <View
                    style={
                      styles.learnIcon
                    }
                  >
                    <Text
                      style={{
                        fontSize: 21,
                      }}
                    >
                      {subj.icon ||
                        "📚"}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Text
                      style={
                        styles.learnName
                      }
                      numberOfLines={1}
                    >
                      {subj.name}
                    </Text>

                    <Text
                      style={
                        styles.learnSub
                      }
                    >
                      Daily Practice
                    </Text>

                    <View
                      style={
                        styles.learnBarBg
                      }
                    >
                      <View
                        style={[
                          styles.learnBarFill,
                          {
                            width: `${progress}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <Text
                    style={
                      styles.learnFraction
                    }
                  >
                    {subj.completedCount ||
                      0}{" "}
                    /{" "}
                    {subj.totalChapters ||
                      0}
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      )}

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <View
        style={styles.section}
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Quick Actions
        </Text>

        <View
          style={
            styles.actionsRow
          }
        >
          <QuickAction
            icon="document-text"
            tint={
              colors.categories[0].fg
            }
            bg={
              colors.categories[0].bg
            }
            label="Mock Tests"
            onPress={() =>
              navigation.navigate(
                "MockTab"
              )
            }
          />

          <QuickAction
            icon="book"
            tint={
              colors.categories[4].fg
            }
            bg={
              colors.categories[4].bg
            }
            label="Practice"
            onPress={() =>
              navigation.navigate(
                "PracticeTab"
              )
            }
          />

          <QuickAction
            icon="newspaper"
            tint={
              colors.categories[2].fg
            }
            bg={
              colors.categories[2].bg
            }
            label="PYQs"
            onPress={() =>
              navigation.navigate(
                "PyqTab"
              )
            }
          />

          <QuickAction
            icon="stats-chart"
            tint={
              colors.categories[3].fg
            }
            bg={
              colors.categories[3].bg
            }
            label="Performance"
            onPress={() =>
              navigation.navigate(
                "Analysis"
              )
            }
          />
        </View>
      </View>

      {/* =================================================
          RECOMMENDED
      ================================================= */}

      <View
        style={styles.section}
      >
        <Text
          style={
            styles.sectionTitle
          }
        >
          Recommended For You
        </Text>

        {upcomingLive ? (
          <TouchableOpacity
            style={styles.recCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                "LiveTab"
              )
            }
          >
            <View
              style={[
                styles.recIcon,
                {
                  backgroundColor:
                    colors
                      .categories[1]
                      .bg,
                },
              ]}
            >
              <Ionicons
                name="radio"
                size={18}
                color={
                  colors
                    .categories[1]
                    .fg
                }
              />
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <Text
                style={
                  styles.recTitle
                }
                numberOfLines={1}
              >
                {upcomingLive.title}
              </Text>

              <Text
                style={
                  styles.recSub
                }
                numberOfLines={1}
              >
                Live ·{" "}
                {new Date(
                  upcomingLive.scheduledAt
                ).toLocaleString(
                  "en-IN",
                  {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  }
                )}
              </Text>
            </View>

            <View
              style={
                styles.recArrow
              }
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  colors.brand
                }
              />
            </View>
          </TouchableOpacity>
        ) : !isPremium ? (
          <PremiumCard
            navigation={navigation}
          />
        ) : (
          <TouchableOpacity
            style={styles.recCard}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate(
                "Referral"
              )
            }
          >
            <View
              style={[
                styles.recIcon,
                {
                  backgroundColor:
                    colors
                      .categories[2]
                      .bg,
                },
              ]}
            >
              <Ionicons
                name="gift"
                size={18}
                color={
                  colors
                    .categories[2]
                    .fg
                }
              />
            </View>

            <View
              style={{
                flex: 1,
                minWidth: 0,
              }}
            >
              <Text
                style={
                  styles.recTitle
                }
              >
                Refer & Earn
              </Text>

              <Text
                style={
                  styles.recSub
                }
              >
                Invite a friend and
                earn credits
              </Text>
            </View>

            <View
              style={
                styles.recArrow
              }
            >
              <Ionicons
                name="chevron-forward"
                size={16}
                color={
                  colors.brand
                }
              />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

/* =========================================================
   PREMIUM CARD
========================================================= */

function PremiumCard({
  navigation,
}) {
  return (
    <TouchableOpacity
      style={
        styles.premiumCard
      }
      activeOpacity={0.92}
      onPress={() =>
        navigation.navigate(
          "Subscription"
        )
      }
    >
      <View
        style={
          styles.premiumGlowOne
        }
      />

      <View
        style={
          styles.premiumGlowTwo
        }
      />

      <View
        style={
          styles.premiumTopRow
        }
      >
        <View
          style={
            styles.premiumIcon
          }
        >
          <Ionicons
            name="diamond"
            size={20}
            color="#FFFFFF"
          />
        </View>

        <View
          style={
            styles.premiumBadge
          }
        >
          <Ionicons
            name="sparkles"
            size={11}
            color="#B7791F"
          />

          <Text
            style={
              styles.premiumBadgeText
            }
          >
            PREMIUM
          </Text>
        </View>
      </View>

      <Text
        style={
          styles.premiumTitle
        }
      >
        Unlock Everything
      </Text>

      <Text
        style={
          styles.premiumDescription
        }
      >
        Unlimited mock tests,
        practice, PYQs and detailed
        performance analytics.
      </Text>

      <View
        style={
          styles.premiumFeatures
        }
      >
        <PremiumFeature
          text="Unlimited Mock Tests"
        />

        <PremiumFeature
          text="All Subject Practice"
        />

        <PremiumFeature
          text="Previous Year Papers"
        />
      </View>

      <View
        style={
          styles.premiumBottom
        }
      >
        <View>
          <Text
            style={
              styles.premiumStarting
            }
          >
            Plans starting from
          </Text>

          <View
            style={
              styles.priceRow
            }
          >
            <Text
              style={
                styles.price
              }
            >
              ₹149
            </Text>

            <Text
              style={
                styles.priceSuffix
              }
            >
              / month
            </Text>
          </View>
        </View>

        <View
          style={
            styles.upgradeButton
          }
        >
          <Text
            style={
              styles.upgradeButtonText
            }
          >
            Upgrade
          </Text>

          <Ionicons
            name="arrow-forward"
            size={15}
            color="#FFFFFF"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   PREMIUM FEATURE
========================================================= */

function PremiumFeature({
  text,
}) {
  return (
    <View
      style={
        styles.premiumFeature
      }
    >
      <View
        style={
          styles.premiumCheck
        }
      >
        <Ionicons
          name="checkmark"
          size={10}
          color="#FFFFFF"
        />
      </View>

      <Text
        style={
          styles.premiumFeatureText
        }
      >
        {text}
      </Text>
    </View>
  );
}

/* =========================================================
   QUICK ACTION
========================================================= */

function QuickAction({
  icon,
  tint,
  bg,
  label,
  onPress,
}) {
  return (
    <TouchableOpacity
      style={styles.action}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: bg,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={tint}
        />
      </View>

      <Text
        style={
          styles.actionLabel
        }
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* =========================================================
   HOME CAROUSEL
========================================================= */

function HomeCarousel({
  navigation,
}) {
  const carouselRef =
    useRef(null);

  const [activeIndex, setActiveIndex] =
    useState(0);

  const slideWidth =
    SCREEN_WIDTH -
    spacing.lg * 2;

  useEffect(() => {
    const interval =
      setInterval(() => {
        setActiveIndex(
          (currentIndex) => {
            const nextIndex =
              currentIndex ===
                HOME_CAROUSEL_DATA.length -
                  1
                ? 0
                : currentIndex + 1;

            carouselRef.current?.scrollTo(
              {
                x:
                  nextIndex *
                  slideWidth,
                animated: true,
              }
            );

            return nextIndex;
          }
        );
      }, 4000);

    return () =>
      clearInterval(interval);
  }, [slideWidth]);

  function handleSlideChange(
    event
  ) {
    const offset =
      event.nativeEvent
        .contentOffset.x;

    const index = Math.round(
      offset / slideWidth
    );

    if (
      index >= 0 &&
      index <
        HOME_CAROUSEL_DATA.length
    ) {
      setActiveIndex(index);
    }
  }

  function openSlide(item) {
    if (!item.action) return;

    navigation.navigate(
      item.action
    );
  }

  return (
    <View
      style={
        styles.carouselWrapper
      }
    >
      <ScrollView
        ref={carouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={
          false
        }
        bounces={false}
        decelerationRate="fast"
        onMomentumScrollEnd={
          handleSlideChange
        }
      >
        {HOME_CAROUSEL_DATA.map(
          (item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.94}
              onPress={() =>
                openSlide(item)
              }
            >
              <HomeCarouselSlide
                item={item}
                slideWidth={
                  slideWidth
                }
              />
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      <View style={styles.dots}>
        {HOME_CAROUSEL_DATA.map(
          (item, index) => (
            <View
              key={item.id}
              style={[
                styles.dot,
                index ===
                  activeIndex &&
                  styles.activeDot,
              ]}
            />
          )
        )}
      </View>
    </View>
  );
}

/* =========================================================
   CAROUSEL SLIDE
========================================================= */

function HomeCarouselSlide({
  item,
  slideWidth,
}) {
  return (
    <View
      style={[
        styles.carouselCard,
        {
          width: slideWidth,
          backgroundColor:
            item.background,
        },
      ]}
    >
      <View
        style={
          styles.carouselContent
        }
      >
        <Text
          style={
            styles.carouselTitle
          }
          numberOfLines={2}
        >
          {item.title}
        </Text>

        <Text
          style={
            styles.carouselDescription
          }
          numberOfLines={3}
        >
          {item.description}
        </Text>

        <View
          style={
            styles.carouselStats
          }
        >
          <View
            style={
              styles.carouselStat
            }
          >
            <View
              style={
                styles.carouselStatIcon
              }
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={
                  item.primary
                }
              />
            </View>

            <Text
              style={
                styles.carouselStatText
              }
            >
              {item.statOne}
            </Text>
          </View>

          <View
            style={
              styles.carouselStat
            }
          >
            <View
              style={
                styles.carouselStatIcon
              }
            >
              <Ionicons
                name={
                  item.secondaryIcon
                }
                size={14}
                color={
                  item.primary
                }
              />
            </View>

            <Text
              style={
                styles.carouselStatText
              }
            >
              {item.statTwo}
            </Text>
          </View>
        </View>
      </View>

      <View
        style={
          styles.carouselArt
        }
      >
        <View
          style={[
            styles.artCircleOne,
            {
              backgroundColor:
                `${item.primary}16`,
            },
          ]}
        />

        <View
          style={[
            styles.artCircleTwo,
            {
              backgroundColor:
                `${item.primary}10`,
            },
          ]}
        />

        <View
          style={[
            styles.mainArtCard,
            {
              borderColor:
                `${item.primary}55`,
            },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={40}
            color={item.primary}
          />

          <View
            style={[
              styles.artCheck,
              {
                backgroundColor:
                  item.primary,
              },
            ]}
          >
            <Ionicons
              name="checkmark"
              size={12}
              color="#FFFFFF"
            />
          </View>
        </View>

        <View
          style={
            styles.floatingIcon
          }
        >
          <Ionicons
            name={
              item.secondaryIcon
            }
            size={20}
            color={item.primary}
          />
        </View>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    section: {
      paddingHorizontal:
        spacing.lg,
      marginBottom:
        spacing.lg,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 88,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingHorizontal:
        spacing.lg,

      paddingBottom: 2,
    },

    /*
     * Logo container is intentionally wider.
     * This prevents the actual logo image from
     * being clipped on either side.
     */

    brandArea: {
      width: 170,
      height: 70,

      justifyContent:
        "center",

      alignItems:
        "flex-start",

      overflow: "visible",

      flexShrink: 1,
    },

    brandLogo: {
      width: 155,
      height: 68,

      maxWidth: "100%",

      marginLeft: 0,
    },

    headerActions: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,

      marginLeft: "auto",

      flexShrink: 0,
    },

    headerIconButton: {
      width: 42,
      height: 42,

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
    },

    notificationDot: {
      position:
        "absolute",

      width: 7,
      height: 7,

      borderRadius: 4,

      backgroundColor:
        colors.danger,

      top: 9,
      right: 9,

      borderWidth: 1.5,

      borderColor:
        colors.surface,
    },

    /* =====================================================
       GREETING
    ===================================================== */

    greetingSection: {
      paddingHorizontal:
        spacing.lg,

      marginTop: 2,

      marginBottom: 18,
    },

    greetingRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      flexWrap:
        "nowrap",

      minWidth: 0,
    },

    greeting: {
      ...type.h1,

      color:
        colors.ink,

      fontSize: 25,

      lineHeight: 31,

      fontWeight:
        "800",

      letterSpacing:
        -0.45,

      flexShrink: 1,
    },

    greetingEmoji: {
      fontSize: 25,

      lineHeight: 31,

      marginLeft: 7,

      includeFontPadding:
        false,
    },

    greetingSub: {
      color:
        colors.slate,

      fontSize: 13,

      lineHeight: 19,

      fontWeight:
        "500",

      marginTop: 3,
    },

    /* =====================================================
       PRACTICE HERO
    ===================================================== */

    hero: {
      backgroundColor:
        colors.heroTint,

      borderRadius: 24,

      padding: 18,

      minHeight: 158,

      justifyContent:
        "center",

      overflow: "hidden",

      borderWidth: 1,

      borderColor:
        colors.heroRing,
    },

    heroDecorationOne: {
      position:
        "absolute",

      width: 145,
      height: 145,

      borderRadius: 73,

      backgroundColor:
        "rgba(255,255,255,0.30)",

      right: -48,
      top: -55,
    },

    heroDecorationTwo: {
      position:
        "absolute",

      width: 72,
      height: 72,

      borderRadius: 36,

      backgroundColor:
        "rgba(255,255,255,0.20)",

      right: 56,
      bottom: -42,
    },

    heroLoading: {
      alignItems:
        "center",

      gap: 10,

      paddingVertical: 20,
    },

    heroLoadingText: {
      color:
        colors.slate,

      ...type.small,
    },

    heroRow: {
      flexDirection:
        "row",

      alignItems:
        "center",
    },

    heroContent: {
      flex: 1,

      minWidth: 0,

      zIndex: 2,
    },

    heroEyebrow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      marginBottom: 5,
    },

    heroEyebrowText: {
      fontSize: 9,

      fontWeight:
        "800",

      color:
        colors.heroAccent,

      letterSpacing: 0.6,
    },

    heroTitle: {
      color:
        colors.ink,

      fontSize: 22,

      lineHeight: 28,

      fontWeight:
        "800",

      letterSpacing:
        -0.35,
    },

    heroSub: {
      color:
        colors.slate,

      fontSize: 12.5,

      lineHeight: 18,

      marginTop: 3,

      marginBottom: 15,

      maxWidth: 190,
    },

    heroButton: {
      alignSelf:
        "flex-start",

      height: 40,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 7,

      backgroundColor:
        colors.ink2,

      paddingHorizontal: 16,

      borderRadius: 13,
    },

    heroButtonText: {
      color:
        "#FFFFFF",

      fontSize: 12,

      fontWeight:
        "800",
    },

    targetWrap: {
      width: 88,
      height: 88,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginLeft: 8,
    },

    targetRingOuter: {
      width: 86,
      height: 86,

      borderRadius: 43,

      backgroundColor:
        colors.heroRing,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    targetRingMid: {
      width: 59,
      height: 59,

      borderRadius: 30,

      backgroundColor:
        "#FF9B85",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    targetRingInner: {
      width: 30,
      height: 30,

      borderRadius: 15,

      backgroundColor:
        "#FFFFFF",
    },

    targetArrow: {
      position:
        "absolute",

      top: 5,

      right: 9,

      transform: [
        {
          rotate: "35deg",
        },
      ],
    },

    /* =====================================================
       CAROUSEL
    ===================================================== */

    carouselWrapper: {
      width: "100%",
    },

    carouselCard: {
      minHeight: 174,

      borderRadius: 24,

      paddingHorizontal: 19,

      paddingVertical: 19,

      flexDirection:
        "row",

      overflow: "hidden",
    },

    carouselContent: {
      flex: 1,

      justifyContent:
        "center",

      zIndex: 5,
    },

    carouselTitle: {
      fontSize: 22,

      lineHeight: 27,

      fontWeight:
        "800",

      color:
        colors.ink,

      marginBottom: 6,

      letterSpacing:
        -0.3,
    },

    carouselDescription: {
      fontSize: 12.5,

      lineHeight: 18,

      color:
        colors.slate,

      maxWidth: 205,
    },

    carouselStats: {
      flexDirection:
        "row",

      alignItems:
        "center",

      marginTop: 14,

      gap: 10,
    },

    carouselStat: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,
    },

    carouselStatIcon: {
      width: 25,
      height: 25,

      borderRadius: 8,

      backgroundColor:
        "rgba(255,255,255,0.88)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    carouselStatText: {
      fontSize: 9,

      fontWeight:
        "700",

      color:
        colors.slate,
    },

    carouselArt: {
      width: 116,

      position:
        "relative",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    artCircleOne: {
      position:
        "absolute",

      width: 130,
      height: 130,

      borderRadius: 65,

      right: -38,
    },

    artCircleTwo: {
      position:
        "absolute",

      width: 78,
      height: 78,

      borderRadius: 39,

      right: 0,
      top: 10,
    },

    mainArtCard: {
      width: 73,
      height: 88,

      borderRadius: 17,

      backgroundColor:
        "#FFFFFF",

      borderWidth: 1.5,

      alignItems:
        "center",

      justifyContent:
        "center",

      transform: [
        {
          rotate: "6deg",
        },
      ],

      shadowColor:
        "#17202E",

      shadowOffset: {
        width: 0,
        height: 5,
      },

      shadowOpacity:
        0.08,

      shadowRadius: 8,

      elevation: 3,
    },

    artCheck: {
      position:
        "absolute",

      right: 7,
      bottom: 7,

      width: 19,
      height: 19,

      borderRadius: 10,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    floatingIcon: {
      position:
        "absolute",

      left: 0,
      bottom: 12,

      width: 41,
      height: 41,

      borderRadius: 21,

      backgroundColor:
        "#FFFFFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      shadowColor:
        "#17202E",

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity:
        0.08,

      shadowRadius: 7,

      elevation: 3,
    },

    dots: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 5,

      marginTop: 9,
    },

    dot: {
      width: 6,
      height: 6,

      borderRadius: 3,

      backgroundColor:
        colors.border,
    },

    activeDot: {
      width: 20,

      backgroundColor:
        colors.brand,
    },

    /* =====================================================
       SECTIONS
    ===================================================== */

    sectionHead: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",

      alignItems:
        "center",

      marginBottom: 12,
    },

    sectionTitle: {
      ...type.h3,

      color:
        colors.ink,

      fontSize: 18,

      marginBottom: 12,
    },

    sectionTitleNoMargin: {
      ...type.h3,

      color:
        colors.ink,

      fontSize: 18,
    },

    viewAll: {
      ...type.small,

      color:
        colors.brand,

      fontWeight:
        "700",
    },

    /* =====================================================
       LEARNING
    ===================================================== */

    learnCard: {
      ...card,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 12,

      padding: spacing.md,
    },

    learnIcon: {
      width: 46,
      height: 46,

      borderRadius: 14,

      backgroundColor:
        colors.heroTint,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    learnName: {
      ...type.bodyStrong,

      color:
        colors.ink,

      fontSize: 14,
    },

    learnSub: {
      ...type.tiny,

      color:
        colors.slateSoft,

      fontWeight:
        "500",

      marginTop: 1,

      marginBottom: 6,
    },

    learnBarBg: {
      height: 5,

      backgroundColor:
        colors.slateLight,

      borderRadius: 3,

      overflow:
        "hidden",
    },

    learnBarFill: {
      height: 5,

      borderRadius: 3,

      backgroundColor:
        colors.heroAccent,
    },

    learnFraction: {
      fontSize: 11.5,

      fontWeight:
        "700",

      color:
        colors.slate,

      marginLeft: 4,
    },

    /* =====================================================
       QUICK ACTIONS
    ===================================================== */

    actionsRow: {
      flexDirection:
        "row",

      justifyContent:
        "space-between",
    },

    action: {
      alignItems:
        "center",

      flex: 1,

      paddingHorizontal: 3,
    },

    actionIcon: {
      width: 50,
      height: 50,

      borderRadius: 15,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 7,
    },

    actionLabel: {
      ...type.tiny,

      color:
        colors.inkSoft,

      fontSize: 10,

      lineHeight: 14,

      fontWeight:
        "600",

      textAlign:
        "center",
    },

    /* =====================================================
       RECOMMENDED
    ===================================================== */

    recCard: {
      ...card,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 11,

      padding: spacing.md,
    },

    recIcon: {
      width: 44,
      height: 44,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    recTitle: {
      ...type.bodyStrong,

      color:
        colors.ink,

      fontSize: 13.5,
    },

    recSub: {
      ...type.tiny,

      color:
        colors.slate,

      fontWeight:
        "500",

      marginTop: 2,
    },

    recArrow: {
      width: 32,
      height: 32,

      borderRadius: 10,

      backgroundColor:
        colors.brandTint,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    /* =====================================================
       PREMIUM
    ===================================================== */

    premiumCard: {
      backgroundColor:
        colors.surface,

      borderRadius: 22,

      padding: 18,

      overflow:
        "hidden",

      borderWidth: 1,

      borderColor:
        colors.border,

      shadowColor:
        colors.brand,

      shadowOffset: {
        width: 0,
        height: 6,
      },

      shadowOpacity:
        0.07,

      shadowRadius: 14,

      elevation: 3,
    },

    premiumGlowOne: {
      position:
        "absolute",

      width: 150,
      height: 150,

      borderRadius: 75,

      backgroundColor:
        colors.brandTint,

      right: -65,
      top: -65,
    },

    premiumGlowTwo: {
      position:
        "absolute",

      width: 100,
      height: 100,

      borderRadius: 50,

      backgroundColor:
        colors.heroTint,

      left: -55,
      bottom: -45,
    },

    premiumTopRow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      marginBottom: 13,
    },

    premiumIcon: {
      width: 43,
      height: 43,

      borderRadius: 14,

      backgroundColor:
        colors.brand,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    premiumBadge: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      paddingHorizontal: 10,

      paddingVertical: 5,

      borderRadius: 20,

      backgroundColor:
        "#FFF8E6",

      borderWidth: 1,

      borderColor:
        "#F5E2A9",
    },

    premiumBadgeText: {
      fontSize: 9,

      fontWeight:
        "800",

      letterSpacing: 0.5,

      color:
        "#A66B0A",
    },

    premiumTitle: {
      fontSize: 22,

      lineHeight: 27,

      fontWeight:
        "800",

      color:
        colors.ink,

      letterSpacing:
        -0.4,

      marginBottom: 5,
    },

    premiumDescription: {
      fontSize: 12.5,

      lineHeight: 18,

      color:
        colors.slate,

      maxWidth: 310,

      marginBottom: 15,
    },

    premiumFeatures: {
      gap: 9,

      marginBottom: 17,
    },

    premiumFeature: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 8,
    },

    premiumCheck: {
      width: 18,
      height: 18,

      borderRadius: 9,

      backgroundColor:
        colors.success,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    premiumFeatureText: {
      fontSize: 11.5,

      fontWeight:
        "600",

      color:
        colors.inkSoft,
    },

    premiumBottom: {
      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",

      paddingTop: 14,

      borderTopWidth: 1,

      borderTopColor:
        colors.border,
    },

    premiumStarting: {
      fontSize: 9,

      color:
        colors.slateSoft,

      marginBottom: 1,
    },

    priceRow: {
      flexDirection:
        "row",

      alignItems:
        "baseline",
    },

    price: {
      fontSize: 21,

      fontWeight:
        "800",

      color:
        colors.ink,
    },

    priceSuffix: {
      fontSize: 10,

      fontWeight:
        "600",

      color:
        colors.slateSoft,

      marginLeft: 3,
    },

    upgradeButton: {
      height: 40,

      paddingHorizontal: 16,

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
    },

    upgradeButtonText: {
      fontSize: 12,

      fontWeight:
        "800",

      color:
        "#FFFFFF",
    },
  });