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
  shadow,
  card,
} from "../theme/theme";

const { width: SCREEN_WIDTH } =
  Dimensions.get("window");

/* =========================================================
   HOME CAROUSEL DATA
========================================================= */

const HOME_CAROUSEL_DATA = [
  {
    id: "mock-tests",
    title: "Mock Tests",
    description:
      "Practice with full-length papers designed like the real exam.",
    icon: "document-text",
    secondaryIcon: "timer-outline",
    background: "#F0F2FF",
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
              ?.exams?.[0] || null
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
     TODAY'S PRACTICE
  ======================================================= */

  async function startTodayTest() {
    setLoadingTest(true);

    try {
      const res = await api.get(
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
                20
              ) + spacing.md,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              "Profile"
            )
          }
          hitSlop={10}
          activeOpacity={0.7}
        >
          <Ionicons
            name="menu"
            size={25}
            color={colors.ink}
          />
        </TouchableOpacity>

        <TouchableOpacity
          hitSlop={10}
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications-outline"
            size={23}
            color={colors.ink}
          />
        </TouchableOpacity>
      </View>

      {/* =================================================
          GREETING
      ================================================= */}

      <View style={styles.section}>
        <Text style={styles.greeting}>
          Hi, {firstName} 👋
        </Text>

        <Text
          style={styles.greetingSub}
        >
          Let's learn and grow
          together
        </Text>
      </View>

      {/* =================================================
          PRACTICE TODAY
      ================================================= */}

      <View style={styles.section}>
        <View style={styles.hero}>
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
                style={{
                  flex: 1,
                }}
              >
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
          AUTO CAROUSEL
      ================================================= */}

      <View style={styles.section}>
        <HomeCarousel
          navigation={navigation}
        />
      </View>

      {/* =================================================
          CONTINUE LEARNING
      ================================================= */}

      {subjects.length > 0 && (
        <View style={styles.section}>
          <View
            style={
              styles.sectionHead
            }
          >
            <Text
              style={
                styles.sectionTitle
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
                          subject: subj,
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
                        fontSize: 20,
                      }}
                    >
                      {subj.icon ||
                        "📚"}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.learnName
                      }
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
                    {
                      subj.completedCount
                    }{" "}
                    /{" "}
                    {
                      subj.totalChapters
                    }
                  </Text>
                </TouchableOpacity>
              );
            })}
        </View>
      )}

      {/* =================================================
          QUICK ACTIONS
      ================================================= */}

      <View style={styles.section}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Quick Actions
        </Text>

        <View
          style={styles.actionsRow}
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
            label="Subject Practice"
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

      <View style={styles.section}>
        <Text
          style={
            styles.sectionTitle
          }
        >
          Recommended For You
        </Text>

        {/* LIVE EXAM */}

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

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.slateSoft
              }
            />
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
                Invite a friend, both
                of you get credits
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                colors.slateSoft
              }
            />
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
      {/* DECORATION */}

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
          styles.premiumGlowThree
        }
      />

      {/* TOP ROW */}

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
            size={21}
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
            color="#FBBF24"
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

      {/* TITLE */}

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
        Get unlimited mock tests,
        subject practice, PYQs and
        detailed performance
        analytics.
      </Text>

      {/* FEATURES */}

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

      {/* BOTTOM */}

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
            size={16}
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
            backgroundColor:
              bg,
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

  /* AUTO SLIDE */

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
                  (SCREEN_WIDTH -
                    36),
                animated: true,
              }
            );

            return nextIndex;
          }
        );
      }, 3500);

    return () =>
      clearInterval(interval);
  }, []);

  /* SLIDE CHANGE */

  function handleSlideChange(
    event
  ) {
    const slideWidth =
      event.nativeEvent
        .layoutMeasurement
        .width;

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
              activeOpacity={0.95}
              onPress={() =>
                openSlide(item)
              }
            >
              <HomeCarouselSlide
                item={item}
              />
            </TouchableOpacity>
          )
        )}
      </ScrollView>

      {/* DOTS */}

      <View
        style={styles.dots}
      >
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
}) {
  return (
    <View
      style={[
        styles.carouselCard,
        {
          backgroundColor:
            item.background,
        },
      ]}
    >
      {/* CONTENT */}

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

      {/* ART */}

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
                `${item.primary}18`,
            },
          ]}
        />

        <View
          style={[
            styles.artCircleTwo,
            {
              backgroundColor:
                `${item.primary}12`,
            },
          ]}
        />

        <View
          style={[
            styles.mainArtCard,
            {
              borderColor:
                item.primary,
            },
          ]}
        >
          <Ionicons
            name={item.icon}
            size={42}
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
            size={21}
            color={item.primary}
          />
        </View>

        <View
          style={[
            styles.decorDot,
            styles.decorDotOne,
            {
              backgroundColor:
                item.primary,
            },
          ]}
        />

        <View
          style={[
            styles.decorDot,
            styles.decorDotTwo,
            {
              backgroundColor:
                item.primary,
            },
          ]}
        />
      </View>
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
    backgroundColor:
      colors.bg,
  },

  section: {
    paddingHorizontal:
      spacing.lg,
    marginBottom:
      spacing.lg,
  },

  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    paddingHorizontal:
      spacing.lg,
    paddingBottom:
      spacing.md,
  },

  /* =======================================================
     GREETING
  ======================================================= */

  greeting: {
    ...type.h1,
    color: colors.ink,
  },

  greetingSub: {
    ...type.small,
    color: colors.slate,
    marginTop: 3,
  },

  /* =======================================================
     PRACTICE TODAY
  ======================================================= */

  hero: {
    backgroundColor:
      colors.heroTint,
    borderRadius:
      radius.xxl,
    padding:
      spacing.lg,
    minHeight: 150,
    justifyContent:
      "center",
    overflow: "hidden",
  },

  heroLoading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 20,
  },

  heroLoadingText: {
    color: colors.slate,
    ...type.small,
  },

  heroRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  heroTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  heroSub: {
    color: colors.slate,
    fontSize: 13,
    marginTop: 3,
    marginBottom: 16,
  },

  heroButton: {
    alignSelf:
      "flex-start",
    backgroundColor:
      colors.ink2,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius:
      radius.full,
  },

  heroButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  targetWrap: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent:
      "center",
  },

  targetRingOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor:
      colors.heroRing,
    alignItems: "center",
    justifyContent:
      "center",
  },

  targetRingMid: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor:
      "#FF9B85",
    alignItems: "center",
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
    position: "absolute",
    top: 6,
    right: 10,
    transform: [
      {
        rotate: "35deg",
      },
    ],
  },

  /* =======================================================
     CAROUSEL
  ======================================================= */

  carouselWrapper: {
    width: "100%",
  },

  carouselCard: {
    width:
      SCREEN_WIDTH - 36,
    minHeight: 174,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: "row",
    overflow: "hidden",
  },

  carouselContent: {
    flex: 1,
    justifyContent:
      "center",
    zIndex: 5,
  },

  carouselTitle: {
    fontSize: 24,
    lineHeight: 29,
    fontWeight: "800",
    color: "#17202E",
    marginBottom: 7,
    letterSpacing: -0.3,
  },

  carouselDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#667085",
    maxWidth: 205,
  },

  carouselStats: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    gap: 12,
  },

  carouselStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  carouselStatIcon: {
    width: 25,
    height: 25,
    borderRadius: 8,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent:
      "center",
  },

  carouselStatText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#667085",
  },

  carouselArt: {
    width: 122,
    position: "relative",
    alignItems: "center",
    justifyContent:
      "center",
  },

  artCircleOne: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    right: -34,
  },

  artCircleTwo: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    right: 0,
    top: 10,
  },

  mainArtCard: {
    width: 76,
    height: 92,
    borderRadius: 16,
    backgroundColor:
      "#FFFFFF",
    borderWidth: 2,
    alignItems: "center",
    justifyContent:
      "center",
    transform: [
      {
        rotate: "7deg",
      },
    ],
    shadowColor:
      "#17202E",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  artCheck: {
    position: "absolute",
    right: 7,
    bottom: 7,
    width: 19,
    height: 19,
    borderRadius: 10,
    alignItems: "center",
    justifyContent:
      "center",
  },

  floatingIcon: {
    position: "absolute",
    left: -1,
    bottom: 12,
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent:
      "center",
    shadowColor:
      "#17202E",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 3,
  },

  decorDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 4,
    opacity: 0.7,
  },

  decorDotOne: {
    right: 3,
    top: 14,
  },

  decorDotTwo: {
    left: 13,
    top: 21,
  },

  dots: {
    flexDirection: "row",
    alignItems: "center",
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
      "#D7DCE5",
  },

  activeDot: {
    width: 20,
    backgroundColor:
      "#FF684A",
  },

  /* =======================================================
     CONTINUE LEARNING
  ======================================================= */

  sectionHead: {
    flexDirection: "row",
    justifyContent:
      "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    ...type.h3,
    color: colors.ink,
    marginBottom: 12,
  },

  viewAll: {
    ...type.small,
    color: colors.slate,
    fontWeight: "600",
  },

  learnCard: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding:
      spacing.md,
  },

  learnIcon: {
    width: 44,
    height: 44,
    borderRadius:
      radius.md,
    backgroundColor:
      colors.heroTint,
    alignItems: "center",
    justifyContent:
      "center",
  },

  learnName: {
    ...type.bodyStrong,
    color: colors.ink,
  },

  learnSub: {
    ...type.tiny,
    color:
      colors.slateSoft,
    fontWeight: "500",
    marginTop: 1,
    marginBottom: 6,
  },

  learnBarBg: {
    height: 5,
    backgroundColor:
      colors.slateLight,
    borderRadius: 3,
    overflow: "hidden",
  },

  learnBarFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor:
      colors.heroAccent,
  },

  learnFraction: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate,
  },

  /* =======================================================
     QUICK ACTIONS
  ======================================================= */

  actionsRow: {
    flexDirection: "row",
    justifyContent:
      "space-between",
  },

  action: {
    alignItems: "center",
    flex: 1,
  },

  actionIcon: {
    width: 48,
    height: 48,
    borderRadius:
      radius.lg,
    alignItems: "center",
    justifyContent:
      "center",
    marginBottom: 8,
  },

  actionLabel: {
    ...type.tiny,
    color:
      colors.inkSoft,
    fontWeight: "600",
    textAlign: "center",
  },

  /* =======================================================
     RECOMMENDED
  ======================================================= */

  recCard: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding:
      spacing.md,
  },

  recIcon: {
    width: 42,
    height: 42,
    borderRadius:
      radius.md,
    alignItems: "center",
    justifyContent:
      "center",
  },

  recTitle: {
    ...type.bodyStrong,
    color: colors.ink,
  },

  recSub: {
    ...type.tiny,
    color: colors.slate,
    fontWeight: "500",
    marginTop: 2,
  },

  /* =======================================================
     PREMIUM CARD
  ======================================================= */

  premiumCard: {
    backgroundColor: "#FFFFFF",

    borderRadius: 24,

    padding: 18,

    overflow: "hidden",

    borderWidth: 1,

    borderColor: "#E9E8FF",

    shadowColor: "#5B5FEF",

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.08,

    shadowRadius: 14,

    elevation: 4,
  },

  premiumGlowOne: {
    position: "absolute",

    width: 150,
    height: 150,

    borderRadius: 75,

    backgroundColor: "#EEF0FF",

    right: -65,
    top: -65,
  },

  premiumGlowTwo: {
    position: "absolute",

    width: 100,
    height: 100,

    borderRadius: 50,

    backgroundColor: "#FFF0EB",

    left: -55,
    bottom: -45,
  },

  premiumGlowThree: {
    position: "absolute",

    width: 70,
    height: 70,

    borderRadius: 35,

    backgroundColor: "#FFF8DF",

    right: 45,
    bottom: -40,
  },

  premiumTopRow: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent:
      "space-between",

    marginBottom: 14,
  },

  premiumIcon: {
    width: 44,
    height: 44,

    borderRadius: 14,

    backgroundColor: "#5B5FEF",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#5B5FEF",

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.2,

    shadowRadius: 7,

    elevation: 3,
  },

  premiumBadge: {
    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    paddingHorizontal: 10,

    paddingVertical: 5,

    borderRadius: 20,

    backgroundColor: "#FFF7DF",

    borderWidth: 1,

    borderColor: "#FDE7A7",
  },

  premiumBadgeText: {
    fontSize: 9,

    fontWeight: "800",

    letterSpacing: 0.5,

    color: "#D99700",
  },

  premiumTitle: {
    fontSize: 23,

    lineHeight: 28,

    fontWeight: "800",

    color: "#17202E",

    letterSpacing: -0.4,

    marginBottom: 6,
  },

  premiumDescription: {
    fontSize: 12.5,

    lineHeight: 18,

    color: "#687587",

    maxWidth: 310,

    marginBottom: 16,
  },

  premiumFeatures: {
    gap: 9,

    marginBottom: 18,
  },

  premiumFeature: {
    flexDirection: "row",

    alignItems: "center",

    gap: 8,
  },

  premiumCheck: {
    width: 18,
    height: 18,

    borderRadius: 9,

    backgroundColor: "#10B981",

    alignItems: "center",
    justifyContent: "center",
  },

  premiumFeatureText: {
    fontSize: 11.5,

    fontWeight: "600",

    color: "#4E5969",
  },

  premiumBottom: {
    flexDirection: "row",

    alignItems: "center",

    justifyContent:
      "space-between",

    paddingTop: 15,

    borderTopWidth: 1,

    borderTopColor: "#EEF0F4",
  },

  premiumStarting: {
    fontSize: 9,

    color: "#8A95A5",

    marginBottom: 1,
  },

  priceRow: {
    flexDirection: "row",

    alignItems: "baseline",
  },

  price: {
    fontSize: 21,

    fontWeight: "800",

    color: "#17202E",
  },

  priceSuffix: {
    fontSize: 10,

    fontWeight: "600",

    color: "#8A95A5",

    marginLeft: 3,
  },

  upgradeButton: {
    height: 40,

    paddingHorizontal: 16,

    borderRadius: 13,

    backgroundColor: "#FF684A",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,

    shadowColor: "#FF684A",

    shadowOffset: {
      width: 0,
      height: 5,
    },

    shadowOpacity: 0.22,

    shadowRadius: 8,

    elevation: 3,
  },

  upgradeButtonText: {
    fontSize: 12,

    fontWeight: "800",

    color: "#FFFFFF",
  },
});