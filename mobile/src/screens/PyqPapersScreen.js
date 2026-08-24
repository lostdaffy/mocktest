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

import {
  useFocusEffect,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  LinearGradient,
} from "expo-linear-gradient";

import api from "../api/client";

import {
  useAuth,
} from "../context/AuthContext";

import {
  isSubscribed,
} from "../utils/subscription";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
  card,
} from "../theme/theme";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

/* =========================================================
   SCREEN
========================================================= */

export default function PyqPapersScreen({
  route,
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const {
    examStage,
    examName,
    year,
  } = route.params;

  const { user } =
    useAuth();

  const subscribed =
    isSubscribed(user);

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
     LOAD PAPERS
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            `/tests/pyq/${encodeURIComponent(
              examStage
            )}/papers/${encodeURIComponent(
              year
            )}`
          );

        setTests(
          Array.isArray(
            res.data?.tests
          )
            ? res.data.tests
            : []
        );
      } catch (err) {
        console.log(
          "PYQ papers loading error:",
          err
        );

        setTests([]);
      } finally {
        setLoading(false);
      }
    },
    [examStage, year]
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
    if (!test?._id) {
      return;
    }

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
          "Premium paper",
          err.response?.data
            ?.message ||
            "Upgrade to unlock this paper.",
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
            "Couldn't load the paper"
        );
      }
    } finally {
      setStarting(null);
    }
  }

  /* =======================================================
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const completed =
      tests.filter(
        (item) =>
          item.attemptStatus ===
          "completed"
      ).length;

    const inProgress =
      tests.filter(
        (item) =>
          item.attemptStatus ===
          "in_progress"
      ).length;

    const free =
      tests.filter(
        (item) =>
          item.isFree
      ).length;

    return {
      completed,
      inProgress,
      free,
      premium:
        tests.length - free,
    };
  }, [tests]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          {
            paddingTop:
              insets.top,
          },
        ]}
      >
        <View
          style={
            styles.loaderCircle
          }
        >
          <ActivityIndicator
            size="small"
            color={
              colors.brand
            }
          />
        </View>

        <Text
          style={
            styles.loadingTitle
          }
        >
          Loading papers
        </Text>

        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Preparing your {year} papers...
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
        data={tests}
        keyExtractor={(item, index) =>
          item?._id ||
          String(index)
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={{
          paddingTop:
            Math.max(
              insets.top + 8,
              18
            ),
          paddingBottom:
            spacing.xxl +
            insets.bottom +
            12,
        }}
        ListHeaderComponent={
          <>
            {/* =================================================
                HEADER
            ================================================= */}

            <View
              style={
                styles.header
              }
            >
              <TouchableOpacity
                style={
                  styles.headerButton
                }
                activeOpacity={
                  0.75
                }
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
                  styles.headerContent
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
                  numberOfLines={1}
                >
                  Previous Year Questions
                </Text>
              </View>

            </View>

            {/* =================================================
                HERO
            ================================================= */}

            <View
              style={
                styles.heroWrap
              }
            >
              <LinearGradient
                colors={[
                  "#0D1263",
                  "#2716C8",
                  "#5725E8",
                ]}
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
                {/* Decorative background */}

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

                <View
                  style={
                    styles.heroRing
                  }
                />

                {/* Content */}

                <View
                  style={
                    styles.heroContent
                  }
                >
                  <View
                    style={
                      styles.heroBadge
                    }
                  >
                    <Ionicons
                      name="document-text"
                      size={11}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.heroBadgeText
                      }
                    >
                      PYQ PRACTICE
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.heroTitle
                    }
                  >
                    {year} Previous
                    {"\n"}
                    Year Papers
                  </Text>

                  <Text
                    style={
                      styles.heroSubtitle
                    }
                  >
                    Practice real exam papers,
                    improve accuracy and master
                    the exam pattern.
                  </Text>
                </View>

                {/* Year artwork */}

                <View
                  style={
                    styles.heroArtwork
                  }
                >
                  <View
                    style={
                      styles.heroYearCard
                    }
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={18}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.heroYear
                      }
                    >
                      {year}
                    </Text>

                    <Text
                      style={
                        styles.heroYearLabel
                      }
                    >
                      PAPER
                    </Text>
                  </View>

                  <View
                    style={
                      styles.heroFloatingIcon
                    }
                  >
                    <Ionicons
                      name="trophy"
                      size={15}
                      color="#FFD84D"
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* =================================================
                STATS
            ================================================= */}

            {tests.length > 0 && (
              <View
                style={
                  styles.statsCard
                }
              >
                <StatItem
                  icon="documents-outline"
                  value={
                    tests.length
                  }
                  label="Papers"
                />

                <View
                  style={
                    styles.statDivider
                  }
                />

                <StatItem
                  icon="checkmark-circle-outline"
                  value={
                    stats.completed
                  }
                  label="Completed"
                />

                <View
                  style={
                    styles.statDivider
                  }
                />

                <StatItem
                  icon="play-circle-outline"
                  value={
                    stats.inProgress
                  }
                  label="In Progress"
                />
              </View>
            )}

            {/* =================================================
                SECTION
            ================================================= */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionText
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Available Papers
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Choose a paper and start
                  your test
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
                  PAPERS
                </Text>
              </View>
            </View>
          </>
        }
        ListEmptyComponent={
          <EmptyState
            onRefresh={load}
          />
        }
        renderItem={({
          item,
          index,
        }) => (
          <PaperCard
            item={item}
            index={index}
            subscribed={
              subscribed
            }
            starting={
              starting
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
   STAT ITEM
========================================================= */

function StatItem({
  icon,
  value,
  label,
}) {
  return (
    <View
      style={
        styles.statItem
      }
    >
      <View
        style={
          styles.statIcon
        }
      >
        <Ionicons
          name={icon}
          size={15}
          color={
            colors.brand
          }
        />
      </View>

      <View
        style={
          styles.statText
        }
      >
        <Text
          style={
            styles.statValue
          }
        >
          {value}
        </Text>

        <Text
          style={
            styles.statLabel
          }
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   PAPER CARD
========================================================= */

function PaperCard({
  item,
  index,
  subscribed,
  starting,
  onPress,
}) {
  const isPremium =
    !item.isFree;

  const locked =
    isPremium &&
    !subscribed;

  const isStarting =
    starting === item._id;

  const completed =
    item.attemptStatus ===
    "completed";

  const inProgress =
    item.attemptStatus ===
    "in_progress";

  const score =
    item.bestAccuracy ??
    item.accuracy ??
    null;

  return (
    <TouchableOpacity
      style={[
        styles.paperCard,
        locked &&
          styles.paperCardLocked,
      ]}
      activeOpacity={
        isStarting ? 1 : 0.78
      }
      onPress={onPress}
      disabled={isStarting}
    >
      {/* =================================================
          NUMBER
      ================================================= */}

      <View
        style={[
          styles.numberBox,
          locked &&
            styles.numberBoxLocked,
        ]}
      >
        <Text
          style={[
            styles.numberText,
            locked &&
              styles.numberTextLocked,
          ]}
        >
          {String(
            index + 1
          ).padStart(2, "0")}
        </Text>
      </View>

      {/* =================================================
          CONTENT
      ================================================= */}

      <View
        style={
          styles.paperContent
        }
      >
        {/* BADGES */}

        <View
          style={
            styles.badgeRow
          }
        >
          {isPremium ? (
            <View
              style={[
                styles.badge,
                locked
                  ? styles.premiumBadge
                  : styles.unlockedBadge,
              ]}
            >
              <Ionicons
                name={
                  locked
                    ? "lock-closed"
                    : "lock-open"
                }
                size={9}
                color={
                  locked
                    ? colors.warn
                    : colors.success
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      locked
                        ? colors.warn
                        : colors.success,
                  },
                ]}
              >
                {locked
                  ? "Premium"
                  : "Unlocked"}
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
                size={9}
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

          {completed &&
            score !== null && (
              <View
                style={[
                  styles.badge,
                  styles.scoreBadge,
                ]}
              >
                <Ionicons
                  name="stats-chart"
                  size={9}
                  color={
                    colors.brand
                  }
                />

                <Text
                  style={[
                    styles.badgeText,
                    {
                      color:
                        colors.brand,
                    },
                  ]}
                >
                  {score}%
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
                name="time"
                size={9}
                color={
                  colors.warn
                }
              />

              <Text
                style={[
                  styles.badgeText,
                  {
                    color:
                      colors.warn,
                  },
                ]}
              >
                Resume
              </Text>
            </View>
          )}
        </View>

        {/* TITLE */}

        <Text
          style={[
            styles.paperTitle,
            locked &&
              styles.paperTitleLocked,
          ]}
          numberOfLines={2}
        >
          {item.title ||
            `Paper ${index + 1}`}
        </Text>

        {/* META */}

        <View
          style={
            styles.metaRow
          }
        >
          {item.pyqShift ? (
            <View
              style={
                styles.metaItem
              }
            >
              <Ionicons
                name="time-outline"
                size={11}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.metaText
                }
                numberOfLines={1}
              >
                {item.pyqShift}
              </Text>
            </View>
          ) : null}

          {item.durationMinutes ? (
            <View
              style={
                styles.metaItem
              }
            >
              <Ionicons
                name="hourglass-outline"
                size={11}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.metaText
                }
              >
                {item.durationMinutes} min
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* =================================================
          ACTION
      ================================================= */}

      {isStarting ? (
        <View
          style={
            styles.actionLoader
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
            styles.actionButton,
            locked &&
              styles.actionLocked,
          ]}
        >
          <Ionicons
            name={
              locked
                ? "lock-closed"
                : completed
                ? "refresh"
                : inProgress
                ? "play-skip-forward"
                : "chevron-forward"
            }
            size={15}
            color={
              locked
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
   EMPTY STATE
========================================================= */

function EmptyState({
  onRefresh,
}) {
  return (
    <View
      style={
        styles.empty
      }
    >
      <View
        style={
          styles.emptyArtwork
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="document-text-outline"
            size={29}
            color={
              colors.brand
            }
          />
        </View>

        <View
          style={
            styles.emptySpark
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
        No papers found
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        There are no previous year
        papers available for this
        year yet.
      </Text>

      <TouchableOpacity
        style={
          styles.emptyButton
        }
        activeOpacity={0.8}
        onPress={onRefresh}
      >
        <Ionicons
          name="refresh-outline"
          size={15}
          color="#FFFFFF"
        />

        <Text
          style={
            styles.emptyButtonText
          }
        >
          Check Again
        </Text>
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

    /* =====================================================
       LOADING
    ===================================================== */

    loadingContainer: {
      flex: 1,
      backgroundColor:
        colors.bg,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loaderCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 12,
      ...shadow.soft,
    },

    loadingTitle: {
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      color:
        colors.ink,
    },

    loadingSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 57,
      paddingHorizontal: 18,
      paddingBottom: 13,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerButton: {
      width: 41,
      height: 41,
      borderRadius: 14,
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

    headerContent: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 11,
    },

    headerTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "900",
      color:
        colors.ink,
      letterSpacing:
        -0.35,
    },

    headerSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    /* =====================================================
       HERO
    ===================================================== */

    heroWrap: {
      marginHorizontal: 18,
      marginBottom: 15,
    },

    hero: {
      minHeight: 164,
      borderRadius: 23,
      paddingHorizontal: 18,
      paddingVertical: 17,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.brand,
    },

    heroContent: {
      flex: 1,
      minWidth: 0,
      zIndex: 5,
    },

    heroBadge: {
      alignSelf:
        "flex-start",
      height: 25,
      paddingHorizontal: 8,
      borderRadius:
        radius.full,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.12)",
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginBottom: 8,
    },

    heroBadgeText: {
      fontSize: 7.5,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: 0.6,
    },

    heroTitle: {
      fontSize: 21,
      lineHeight: 26,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },

    heroSubtitle: {
      maxWidth: 225,
      fontSize: 10.5,
      lineHeight: 16,
      color:
        "rgba(255,255,255,0.76)",
      marginTop: 5,
    },

    /* =====================================================
       HERO ART
    ===================================================== */

    heroArtwork: {
      width: 82,
      height: 105,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
      marginLeft: 8,
    },

    heroYearCard: {
      width: 67,
      height: 78,
      borderRadius: 18,
      backgroundColor:
        "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.23)",
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "6deg",
        },
      ],
    },

    heroYear: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "900",
      color: "#FFFFFF",
      marginTop: 4,
    },

    heroYearLabel: {
      fontSize: 6.5,
      lineHeight: 9,
      fontWeight: "900",
      color:
        "rgba(255,255,255,0.62)",
      letterSpacing: 0.7,
      marginTop: 1,
    },

    heroFloatingIcon: {
      position:
        "absolute",
      right: -2,
      bottom: 2,
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor:
        "rgba(255,255,255,0.14)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.17)",
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "-8deg",
        },
      ],
    },

    heroOrbOne: {
      position:
        "absolute",
      width: 205,
      height: 205,
      borderRadius: 103,
      right: -92,
      top: -110,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroOrbTwo: {
      position:
        "absolute",
      width: 110,
      height: 110,
      borderRadius: 55,
      left: -54,
      bottom: -72,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    heroRing: {
      position:
        "absolute",
      width: 165,
      height: 165,
      borderRadius: 83,
      borderWidth: 19,
      borderColor:
        "rgba(255,255,255,0.035)",
      right: -75,
      bottom: -82,
      transform: [
        {
          rotate: "18deg",
        },
      ],
    },

    /* =====================================================
       STATS
    ===================================================== */

    statsCard: {
      marginHorizontal: 18,
      marginBottom: 21,
      minHeight: 68,
      paddingVertical: 11,
      paddingHorizontal: 8,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      borderWidth: 1,
      borderColor:
        colors.border,
      flexDirection:
        "row",
      alignItems:
        "center",
      ...shadow.soft,
    },

    statItem: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 7,
      minWidth: 0,
    },

    statIcon: {
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexShrink: 0,
    },

    statText: {
      minWidth: 0,
    },

    statValue: {
      fontSize: 14,
      lineHeight: 17,
      fontWeight: "900",
      color:
        colors.ink,
    },

    statLabel: {
      fontSize: 8.5,
      lineHeight: 11,
      color:
        colors.slateSoft,
      marginTop: 1,
      fontWeight: "600",
    },

    statDivider: {
      width: 1,
      height: 30,
      backgroundColor:
        colors.border,
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

    sectionText: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
    },

    sectionTitle: {
      fontSize: 19,
      lineHeight: 24,
      fontWeight: "900",
      color:
        colors.ink,
      letterSpacing:
        -0.35,
    },

    sectionSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        colors.slate,
      marginTop: 2,
    },

    countBadge: {
      width: 48,
      height: 44,
      borderRadius: 14,
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

    countNumber: {
      fontSize: 14,
      lineHeight: 17,
      fontWeight: "900",
      color:
        colors.brand,
    },

    countLabel: {
      fontSize: 6.5,
      lineHeight: 9,
      fontWeight: "900",
      color:
        colors.slateSoft,
      letterSpacing: 0.5,
      marginTop: 1,
    },

    /* =====================================================
       PAPER CARD
    ===================================================== */

    paperCard: {
      ...card,
      minHeight: 98,
      marginHorizontal: 18,
      marginBottom: 10,
      padding: 11,
      borderRadius: 19,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.border,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    paperCardLocked: {
      backgroundColor:
        "#FCFCFE",
    },

    /* =====================================================
       NUMBER
    ===================================================== */

    numberBox: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
      flexShrink: 0,
    },

    numberBoxLocked: {
      backgroundColor:
        colors.warnLight,
    },

    numberText: {
      fontSize: 12,
      fontWeight: "900",
      color:
        colors.brand,
    },

    numberTextLocked: {
      color:
        colors.warn,
    },

    /* =====================================================
       CONTENT
    ===================================================== */

    paperContent: {
      flex: 1,
      minWidth: 0,
    },

    badgeRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      flexWrap:
        "wrap",
      gap: 5,
      marginBottom: 5,
    },

    badge: {
      minHeight: 20,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius:
        radius.full,
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 3,
    },

    freeBadge: {
      backgroundColor:
        colors.successLight,
    },

    premiumBadge: {
      backgroundColor:
        colors.warnLight,
    },

    unlockedBadge: {
      backgroundColor:
        colors.successLight,
    },

    scoreBadge: {
      backgroundColor:
        colors.brandLight,
    },

    resumeBadge: {
      backgroundColor:
        colors.warnLight,
    },

    badgeText: {
      fontSize: 8,
      lineHeight: 11,
      fontWeight: "800",
    },

    paperTitle: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "850",
      color:
        colors.ink,
    },

    paperTitleLocked: {
      color:
        colors.slate,
    },

    metaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      flexWrap:
        "wrap",
      gap: 10,
      marginTop: 5,
    },

    metaItem: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      maxWidth: "100%",
    },

    metaText: {
      fontSize: 9,
      lineHeight: 13,
      color:
        colors.slateSoft,
      fontWeight: "600",
      flexShrink: 1,
    },

    /* =====================================================
       ACTION
    ===================================================== */

    actionButton: {
      width: 37,
      height: 37,
      borderRadius: 13,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 9,
      flexShrink: 0,
    },

    actionLocked: {
      backgroundColor:
        colors.warnLight,
    },

    actionLoader: {
      width: 37,
      height: 37,
      borderRadius: 13,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 9,
      flexShrink: 0,
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

    emptyArtwork: {
      position:
        "relative",
      marginBottom: 15,
    },

    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    emptySpark: {
      position:
        "absolute",
      right: -3,
      top: -3,
      width: 26,
      height: 26,
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
      lineHeight: 23,
      fontWeight: "900",
      color:
        colors.ink,
      marginBottom: 5,
    },

    emptyText: {
      maxWidth: 285,
      fontSize: 11.5,
      lineHeight: 18,
      color:
        colors.slate,
      textAlign: "center",
    },

    emptyButton: {
      height: 42,
      paddingHorizontal: 17,
      borderRadius: 13,
      backgroundColor:
        colors.brand,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      gap: 6,
      marginTop: 17,
      ...shadow.brand,
    },

    emptyButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  });