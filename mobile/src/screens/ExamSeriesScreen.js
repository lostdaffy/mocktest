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
   MAIN SCREEN
========================================================= */

export default function ExamSeriesScreen({
  route,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    examStage,
    examName,
  } = route.params;

  const { user } = useAuth();

  const subscribed =
    isSubscribed(user);

  const [tests, setTests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [starting, setStarting] =
    useState(null);

  /* =======================================================
     HIDE NATIVE NAVIGATION HEADER
  ======================================================= */

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  /* =======================================================
     EXAM META
  ======================================================= */

  const meta =
    EXAM_META[examStage] ||
    DEFAULT_META;

  /* =======================================================
     LOAD TESTS
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            `/tests/exam-series/${examStage}`
          );

        setTests(
          res.data?.tests || []
        );
      } catch (err) {
        console.log(
          "Exam series loading error:",
          err
        );
      } finally {
        setLoading(false);
      }
    },
    [examStage]
  );

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     START TEST
  ======================================================= */

  async function startTest(test) {
    setStarting(test._id);

    try {
      const res =
        await api.get(
          `/tests/${test._id}`
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
          "Premium test",
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
      setStarting(null);
    }
  }

  /* =======================================================
     FEATURED
  ======================================================= */

  const featured =
    useMemo(() => {
      if (!tests.length) {
        return null;
      }

      return (
        tests.find(
          (test) =>
            test.attemptStatus ===
            "in_progress"
        ) ||
        tests.find(
          (test) =>
            !test.attemptStatus
        ) ||
        tests[0]
      );
    }, [tests]);

  const rest =
    useMemo(
      () =>
        tests.filter(
          (test) =>
            test._id !==
            featured?._id
        ),
      [tests, featured]
    );

  const freeCount =
    useMemo(
      () =>
        tests.filter(
          (test) =>
            test.isFree
        ).length,
      [tests]
    );

  const completedCount =
    useMemo(
      () =>
        tests.filter(
          (test) =>
            test.attemptStatus ===
            "completed"
        ).length,
      [tests]
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
            color="#FF684A"
          />
        </View>

        <Text
          style={
            styles.loadingText
          }
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
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingBottom:
            spacing.xxl +
            insets.bottom,
        }}
        ListHeaderComponent={
          <>
            {/* =================================================
                CUSTOM HEADER
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
                  color={
                    colors.ink
                  }
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
                  {examName}
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Mock Test Series
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
                  color={
                    colors.slate
                  }
                />
              </TouchableOpacity>
            </View>

            {/* =================================================
                HERO
            ================================================= */}

            <SeriesHero
              examName={examName}
              meta={meta}
              total={tests.length}
              free={freeCount}
              completed={
                completedCount
              }
            />

            {/* =================================================
                RECOMMENDED
            ================================================= */}

            {featured && (
              <>
                <SectionHeader
                  title={
                    featured.attemptStatus ===
                    "in_progress"
                      ? "Continue Practice"
                      : "Recommended For You"
                  }
                  subtitle={
                    featured.attemptStatus ===
                    "in_progress"
                      ? "Continue your unfinished test"
                      : "Start with your next mock test"
                  }
                />

                <FeaturedTestCard
                  test={featured}
                  subscribed={
                    subscribed
                  }
                  meta={meta}
                  starting={
                    starting ===
                    featured._id
                  }
                  onPress={() =>
                    startTest(
                      featured
                    )
                  }
                />
              </>
            )}

            {/* =================================================
                ALL TESTS
            ================================================= */}

            {rest.length > 0 && (
              <View
                style={
                  styles.listHeader
                }
              >
                <View
                  style={
                    styles.listHeaderText
                  }
                >
                  <Text
                    style={
                      styles.listTitle
                    }
                  >
                    All Mock Tests
                  </Text>

                  <Text
                    style={
                      styles.listSubtitle
                    }
                  >
                    Practice the complete
                    test series
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
                    {tests.length}
                  </Text>

                  <Text
                    style={
                      styles.countLabel
                    }
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
            subscribed={
              subscribed
            }
            meta={meta}
            starting={
              starting ===
              item._id
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
}) {
  return (
    <View
      style={[
        styles.hero,
        {
          backgroundColor:
            meta.light,
        },
      ]}
    >
      {/* DECORATION */}

      <View
        style={[
          styles.heroOrbOne,
          {
            backgroundColor:
              `${meta.accent}12`,
          },
        ]}
      />

      <View
        style={[
          styles.heroOrbTwo,
          {
            backgroundColor:
              `${meta.accent}18`,
          },
        ]}
      />

      {/* CONTENT */}

      <View
        style={
          styles.heroContent
        }
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
          style={
            styles.heroTitle
          }
        >
          Practice like{"\n"}
          the real exam.
        </Text>

        <Text
          style={
            styles.heroDescription
          }
        >
          Full-length tests to
          improve your speed,
          accuracy and confidence.
        </Text>

        {/* STATS */}

        <View
          style={
            styles.heroStats
          }
        >
          <HeroStat
            value={total}
            label="Tests"
          />

          <View
            style={
              styles.heroDivider
            }
          />

          <HeroStat
            value={free}
            label="Free"
          />

          <View
            style={
              styles.heroDivider
            }
          />

          <HeroStat
            value={completed}
            label="Done"
          />
        </View>
      </View>

      {/* ART */}

      <View
        style={
          styles.heroArt
        }
      >
        <View
          style={[
            styles.artCircle,
            {
              backgroundColor:
                `${meta.accent}15`,
            },
          ]}
        />

        <View
          style={
            styles.paper
          }
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
            style={
              styles.paperTop
            }
          >
            <Ionicons
              name={meta.icon}
              size={19}
              color="#FFFFFF"
            />
          </LinearGradient>

          <PaperLine
            checked
          />

          <PaperLine
            checked
          />

          <PaperLine />
        </View>

        <View
          style={
            styles.timerBubble
          }
        >
          <Ionicons
            name="timer-outline"
            size={18}
            color="#FF684A"
          />
        </View>

        <View
          style={
            styles.sparkleBubble
          }
        >
          <Ionicons
            name="sparkles"
            size={13}
            color="#F59E0B"
          />
        </View>
      </View>
    </View>
  );
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
      style={
        styles.heroStat
      }
    >
      <Text
        style={
          styles.heroStatValue
        }
      >
        {value}
      </Text>

      <Text
        style={
          styles.heroStatLabel
        }
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
      style={
        styles.sectionHeader
      }
    >
      <Text
        style={
          styles.sectionTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.sectionSubtitle
        }
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
      style={
        styles.featuredCard
      }
      activeOpacity={0.82}
      onPress={onPress}
      disabled={starting}
    >
      {/* ACCENT */}

      <View
        style={[
          styles.featuredAccent,
          {
            backgroundColor:
              meta.accent,
          },
        ]}
      />

      {/* ICON */}

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
          style={
            styles.featuredIcon
          }
        >
          <Ionicons
            name={meta.icon}
            size={21}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>

      {/* CONTENT */}

      <View
        style={
          styles.featuredContent
        }
      >
        <View
          style={
            styles.featuredBadge
          }
        >
          <Ionicons
            name={
              isResume
                ? "play"
                : "sparkles"
            }
            size={8}
            color="#FF684A"
          />

          <Text
            style={
              styles.featuredBadgeText
            }
          >
            {isResume
              ? "CONTINUE"
              : "RECOMMENDED"}
          </Text>
        </View>

        <Text
          style={
            styles.featuredTitle
          }
          numberOfLines={1}
        >
          {test.title}
        </Text>

        <View
          style={
            styles.featuredMeta
          }
        >
          <Meta
            icon="time-outline"
            text={`${test.durationMinutes} min`}
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

      {/* ARROW */}

      <View
        style={
          styles.featuredArrow
        }
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
                : "chevron-forward"
            }
            size={17}
            color={
              locked
                ? "#D99700"
                : "#687587"
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
            style={
              styles.activeDot
            }
          />
        )}
      </View>

      {/* CARD */}

      <TouchableOpacity
        style={[
          styles.rowCard,
          isActive &&
            styles.rowCardActive,
        ]}
        activeOpacity={0.8}
        onPress={onPress}
        disabled={starting}
      >
        {/* ICON */}

        <View
          style={[
            styles.rowIcon,
            {
              backgroundColor:
                isActive
                  ? meta.light
                  : isCompleted
                  ? "#ECFDF5"
                  : "#F4F5F8",
            },
          ]}
        >
          <Ionicons
            name={
              isActive
                ? "play"
                : isCompleted
                ? "checkmark-done"
                : "document-text-outline"
            }
            size={17}
            color={
              isActive
                ? meta.accent
                : isCompleted
                ? "#10B981"
                : "#7A8697"
            }
          />
        </View>

        {/* CONTENT */}

        <View
          style={
            styles.rowContent
          }
        >
          <Text
            style={
              styles.rowTitle
            }
            numberOfLines={1}
          >
            {item.title}
          </Text>

          <View
            style={
              styles.rowMeta
            }
          >
            <Meta
              icon="time-outline"
              text={`${item.durationMinutes} min`}
            />

            {questions > 0 && (
              <Meta
                icon="help-circle-outline"
                text={`${questions} Q`}
              />
            )}
          </View>

          <View
            style={
              styles.rowTags
            }
          >
            <StatusTag
              locked={locked}
              isFree={item.isFree}
            />

            {isCompleted && (
              <View
                style={
                  styles.accuracyTag
                }
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
                style={
                  styles.resumeTag
                }
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

        {/* ACTION */}

        <View
          style={styles.rowArrow}
        >
          {starting ? (
            <ActivityIndicator
              size="small"
              color={
                meta.accent
              }
            />
          ) : (
            <Ionicons
              name={
                locked
                  ? "lock-closed-outline"
                  : "chevron-forward"
              }
              size={16}
              color={
                locked
                  ? "#D99700"
                  : "#98A2B3"
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
            ? "#D99700"
            : "#10B981"
        }
      />

      <Text
        style={[
          styles.statusText,
          {
            color: locked
              ? "#D99700"
              : "#10B981",
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
      style={
        styles.metaItem
      }
    >
      <Ionicons
        name={icon}
        size={11}
        color="#98A2B3"
      />

      <Text
        style={
          styles.metaText
        }
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
        style={
          styles.emptyIcon
        }
      >
        <Ionicons
          name="document-text-outline"
          size={28}
          color="#5B5FEF"
        />

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
        No mock tests yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        New mock test series will
        appear here shortly.
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
       CUSTOM HEADER
    ===================================================== */

    header: {
      minHeight: 76,
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
      minWidth: 0,
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
       HERO
    ===================================================== */

    hero: {
      marginHorizontal: 18,
      minHeight: 164,
      borderRadius: 24,
      paddingHorizontal: 18,
      paddingVertical: 17,
      flexDirection:
        "row",
      overflow: "hidden",
      marginBottom: 22,
    },

    heroContent: {
      flex: 1,
      justifyContent:
        "center",
      zIndex: 5,
    },

    heroBadge: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius:
        radius.full,
      marginBottom: 7,
    },

    heroBadgeDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    heroBadgeText: {
      fontSize: 8,
      fontWeight:
        "800",
      letterSpacing:
        0.4,
    },

    heroTitle: {
      fontSize: 21,
      lineHeight: 25,
      fontWeight:
        "800",
      color: colors.ink,
      letterSpacing:
        -0.4,
      marginBottom: 5,
    },

    heroDescription: {
      fontSize: 10.5,
      lineHeight: 15,
      color: colors.slate,
      maxWidth: 205,
    },

    heroStats: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 10,
    },

    heroStat: {
      minWidth: 34,
    },

    heroStatValue: {
      fontSize: 13,
      fontWeight:
        "800",
      color: colors.ink,
    },

    heroStatLabel: {
      fontSize: 7.5,
      color: colors.slate,
      fontWeight:
        "600",
      marginTop: 1,
    },

    heroDivider: {
      width: 1,
      height: 21,
      backgroundColor:
        "rgba(23,32,46,0.10)",
      marginHorizontal: 6,
    },

    /* =====================================================
       HERO ART
    ===================================================== */

    heroArt: {
      width: 108,
      position:
        "relative",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    heroOrbOne: {
      position:
        "absolute",
      width: 140,
      height: 140,
      borderRadius: 70,
      right: -52,
      top: 10,
    },

    heroOrbTwo: {
      position:
        "absolute",
      width: 80,
      height: 80,
      borderRadius: 40,
      right: 2,
      top: 25,
    },

    artCircle: {
      position:
        "absolute",
      width: 105,
      height: 105,
      borderRadius: 53,
    },

    paper: {
      width: 63,
      height: 82,
      borderRadius: 12,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      paddingTop: 8,
      transform: [
        {
          rotate: "7deg",
        },
      ],
      ...shadow.soft,
    },

    paperTop: {
      width: 38,
      height: 34,
      borderRadius: 10,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 7,
    },

    paperLineRow: {
      width: 43,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginBottom: 5,
    },

    paperCheck: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        "#10B981",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    paperEmpty: {
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        "#D9DDE6",
    },

    paperLine: {
      flex: 1,
      height: 3,
      borderRadius: 3,
      backgroundColor:
        "#E4E7EE",
    },

    paperLineShort: {
      width: 21,
      height: 3,
      borderRadius: 3,
      backgroundColor:
        "#EEF0F4",
    },

    timerBubble: {
      position:
        "absolute",
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        "#FFF4EF",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
      left: 0,
      bottom: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.soft,
    },

    sparkleBubble: {
      position:
        "absolute",
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor:
        "#FFF8DF",
      borderWidth: 2,
      borderColor:
        "#FFFFFF",
      right: -2,
      top: 19,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.soft,
    },

    /* =====================================================
       SECTION HEADER
    ===================================================== */

    sectionHeader: {
      marginHorizontal: 18,
      marginBottom: 10,
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
      fontSize: 10.5,
      color: colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       FEATURED CARD
    ===================================================== */

    featuredCard: {
      marginHorizontal: 18,
      minHeight: 82,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      padding: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      marginBottom: 22,
      overflow: "hidden",
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    featuredAccent: {
      position:
        "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: 4,
    },

    featuredIconBox: {
      width: 52,
      height: 52,
      borderRadius: 16,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    featuredIcon: {
      width: 43,
      height: 43,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    featuredContent: {
      flex: 1,
      marginLeft: 11,
      minWidth: 0,
    },

    featuredBadge: {
      alignSelf:
        "flex-start",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      backgroundColor:
        "#FFF1EC",
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      marginBottom: 4,
    },

    featuredBadgeText: {
      fontSize: 7.5,
      fontWeight:
        "800",
      color: "#FF684A",
      letterSpacing:
        0.3,
    },

    featuredTitle: {
      fontSize: 14,
      fontWeight:
        "800",
      color: colors.ink,
      marginBottom: 5,
    },

    featuredMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
      flexWrap:
        "wrap",
      gap: 7,
    },

    featuredArrow: {
      width: 31,
      height: 31,
      borderRadius: 16,
      backgroundColor:
        "#F5F6F8",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 6,
    },

    /* =====================================================
       ALL TESTS HEADER
    ===================================================== */

    listHeader: {
      marginHorizontal: 18,
      marginBottom: 11,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    listHeaderText: {
      flex: 1,
    },

    listTitle: {
      fontSize: 19,
      fontWeight:
        "800",
      color: colors.ink,
      letterSpacing:
        -0.3,
    },

    listSubtitle: {
      fontSize: 10.5,
      color: colors.slate,
      marginTop: 2,
    },

    countBadge: {
      width: 42,
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
       MOCK ROW
    ===================================================== */

    row: {
      flexDirection:
        "row",
      gap: 8,
      marginHorizontal: 18,
      marginBottom: 9,
    },

    numberColumn: {
      width: 27,
      alignItems:
        "center",
      paddingTop: 17,
    },

    numberColumnActive: {
      paddingTop: 14,
    },

    numberText: {
      fontSize: 11,
      fontWeight:
        "800",
      color:
        colors.slateSoft,
    },

    numberTextActive: {
      color:
        colors.brand,
    },

    activeDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor:
        "#FF684A",
      marginTop: 3,
    },

    rowCard: {
      flex: 1,
      minHeight: 70,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 8,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      ...shadow.soft,
    },

    rowCardActive: {
      backgroundColor:
        colors.brandTint,
      borderColor:
        colors.brandLight,
    },

    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 10,
    },

    rowContent: {
      flex: 1,
      minWidth: 0,
    },

    rowTitle: {
      fontSize: 13,
      fontWeight:
        "800",
      color:
        colors.ink,
      marginBottom: 4,
    },

    rowMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 8,
      marginBottom: 4,
    },

    rowTags: {
      flexDirection:
        "row",
      alignItems:
        "center",
      flexWrap:
        "wrap",
      gap: 4,
    },

    rowArrow: {
      width: 29,
      height: 29,
      borderRadius: 15,
      backgroundColor:
        "#F5F6F8",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 5,
    },

    /* =====================================================
       META
    ===================================================== */

    metaItem: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 3,
    },

    metaText: {
      fontSize: 9,
      color:
        colors.slateSoft,
      fontWeight:
        "600",
    },

    statusTag: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius:
        radius.full,
    },

    premiumTag: {
      backgroundColor:
        colors.warnLight,
    },

    freeTag: {
      backgroundColor:
        colors.successLight,
    },

    statusText: {
      fontSize: 8,
      fontWeight:
        "700",
    },

    accuracyTag: {
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
        colors.brandLight,
    },

    accuracyText: {
      fontSize: 8,
      fontWeight:
        "800",
      color:
        colors.brand,
    },

    resumeTag: {
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      backgroundColor:
        "#FFF1EC",
    },

    resumeText: {
      fontSize: 8,
      fontWeight:
        "700",
      color:
        "#FF684A",
    },

    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      alignItems:
        "center",
      paddingVertical: 65,
      paddingHorizontal: 30,
    },

    emptyIcon: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 14,
      position:
        "relative",
    },

    emptySparkle: {
      position:
        "absolute",
      right: 3,
      top: 4,
      width: 23,
      height: 23,
      borderRadius: 12,
      backgroundColor:
        "#FFF8DF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    emptyTitle: {
      fontSize: 17,
      fontWeight:
        "800",
      color:
        colors.ink,
      marginBottom: 4,
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