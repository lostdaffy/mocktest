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

import api from "../api/client";

import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";

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
  const insets = useSafeAreaInsets();

  const {
    examStage,
    examName,
    year,
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
          res.data?.tests || []
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
    if (!test?._id) return;

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

    const premium =
      tests.length - free;

    return {
      completed,
      inProgress,
      free,
      premium,
    };
  }, [tests]);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
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
            styles.loadingText
          }
        >
          Loading previous papers...
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
        keyExtractor={(item) =>
          item._id
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
            insets.bottom,
        }}
        ListHeaderComponent={
          <>
            {/* =============================================
                HEADER
            ============================================= */}

            <View
              style={
                styles.header
              }
            >
              <TouchableOpacity
                style={
                  styles.backButton
                }
                activeOpacity={0.75}
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
                >
                  Previous Year Questions
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.refreshButton
                }
                activeOpacity={0.75}
                onPress={load}
              >
                <Ionicons
                  name="refresh-outline"
                  size={18}
                  color={
                    colors.slate
                  }
                />
              </TouchableOpacity>
            </View>

            {/* =============================================
                HERO
            ============================================= */}

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
                style={
                  styles.hero
                }
              >
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
                    {year} Papers
                  </Text>

                  <Text
                    style={
                      styles.heroSubtitle
                    }
                  >
                    Attempt real exam
                    papers and improve
                    your preparation.
                  </Text>
                </View>

                <View
                  style={
                    styles.heroYear
                  }
                >
                  <Text
                    style={
                      styles.heroYearText
                    }
                  >
                    {year}
                  </Text>

                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={
                      "rgba(255,255,255,0.75)"
                    }
                  />
                </View>
              </LinearGradient>
            </View>

            {/* =============================================
                STATS
            ============================================= */}

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

            {/* =============================================
                SECTION HEADER
            ============================================= */}

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
                  Choose a paper and
                  start your test
                </Text>
              </View>

              <View
                style={
                  styles.paperCountBadge
                }
              >
                <Text
                  style={
                    styles.paperCountNumber
                  }
                >
                  {tests.length}
                </Text>

                <Text
                  style={
                    styles.paperCountLabel
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

      <View>
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

  return (
    <TouchableOpacity
      style={[
        styles.paperCard,
        locked &&
          styles.paperCardLocked,
      ]}
      activeOpacity={0.78}
      onPress={onPress}
      disabled={isStarting}
    >
      {/* LEFT NUMBER */}

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

      {/* MAIN */}

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

          {completed && (
            <View
              style={[
                styles.badge,
                styles.scoreBadge,
              ]}
            >
              <Ionicons
                name="checkmark-done"
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
                {item.bestAccuracy}%
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
          {item.title}
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
                size={12}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.metaText
                }
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
                size={12}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.metaText
                }
              >
                {item.durationMinutes}{" "}
                min
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* ACTION */}

      {isStarting ? (
        <ActivityIndicator
          size="small"
          color={
            colors.brand
          }
          style={
            styles.loader
          }
        />
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
          styles.emptyIconWrap
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="document-text-outline"
            size={28}
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
      fontWeight: "600",
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 56,
      paddingHorizontal: 18,
      paddingBottom: 13,
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
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

    headerContent: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 12,
    },

    headerTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "800",
      color: colors.ink,
      letterSpacing: -0.3,
    },

    headerSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color: colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    refreshButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
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

    /* =====================================================
       HERO
    ===================================================== */

    heroWrap: {
      marginHorizontal: 18,
      marginBottom: 14,
    },

    hero: {
      minHeight: 126,
      borderRadius: 21,
      paddingHorizontal: 17,
      paddingVertical: 15,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.brand,
    },

    heroContent: {
      flex: 1,
      zIndex: 2,
    },

    heroBadge: {
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

    heroBadgeText: {
      fontSize: 7.5,
      fontWeight: "800",
      color: "#FFFFFF",
      letterSpacing: 0.4,
    },

    heroTitle: {
      fontSize: 20,
      lineHeight: 25,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.4,
    },

    heroSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        "rgba(255,255,255,0.78)",
      marginTop: 3,
      maxWidth: 225,
    },

    heroYear: {
      width: 65,
      height: 65,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.13)",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 10,
      zIndex: 2,
    },

    heroYearText: {
      fontSize: 17,
      lineHeight: 21,
      fontWeight: "900",
      color: "#FFFFFF",
      marginBottom: 2,
    },

    heroOrbOne: {
      position:
        "absolute",
      width: 150,
      height: 150,
      borderRadius: 75,
      right: -72,
      top: -82,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroOrbTwo: {
      position:
        "absolute",
      width: 95,
      height: 95,
      borderRadius: 48,
      left: -50,
      bottom: -64,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    /* =====================================================
       STATS
    ===================================================== */

    statsCard: {
      marginHorizontal: 18,
      marginBottom: 21,
      padding: 11,
      minHeight: 67,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
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
    },

    statValue: {
      fontSize: 14,
      lineHeight: 17,
      fontWeight: "900",
      color: colors.ink,
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
      height: 29,
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
    },

    sectionTitle: {
      fontSize: 19,
      lineHeight: 23,
      fontWeight: "800",
      color: colors.ink,
      letterSpacing: -0.35,
    },

    sectionSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color: colors.slate,
      marginTop: 2,
    },

    paperCountBadge: {
      minWidth: 43,
      height: 42,
      borderRadius: 13,
      backgroundColor:
        "#FFFFFF",
      borderWidth: 1,
      borderColor:
        colors.border,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    paperCountNumber: {
      fontSize: 13,
      fontWeight: "900",
      color: colors.brand,
    },

    paperCountLabel: {
      fontSize: 6.5,
      fontWeight: "800",
      color:
        colors.slateSoft,
      marginTop: 1,
      letterSpacing: 0.3,
    },

    /* =====================================================
       PAPER CARD
    ===================================================== */

    paperCard: {
      ...card,
      minHeight: 96,
      marginHorizontal: 18,
      marginBottom: 10,
      padding: 11,
      borderRadius: 18,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        "#FFFFFF",
    },

    paperCardLocked: {
      opacity: 0.88,
    },

    numberBox: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
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

    paperContent: {
      flex: 1,
      minWidth: 0,
    },

    badgeRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 5,
      flexWrap:
        "wrap",
      marginBottom: 5,
    },

    badge: {
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
      fontSize: 8.5,
      fontWeight: "800",
    },

    paperTitle: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
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
      gap: 10,
      marginTop: 5,
      flexWrap:
        "wrap",
    },

    metaItem: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
    },

    metaText: {
      fontSize: 9.5,
      lineHeight: 13,
      color:
        colors.slateSoft,
      fontWeight: "600",
    },

    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 9,
    },

    actionLocked: {
      backgroundColor:
        colors.warnLight,
    },

    loader: {
      width: 36,
      marginLeft: 9,
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

    emptySpark: {
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
      lineHeight: 22,
      fontWeight: "800",
      color: colors.ink,
      marginBottom: 5,
    },

    emptyText: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.slate,
      textAlign: "center",
      maxWidth: 290,
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
      marginTop: 16,
      ...shadow.brand,
    },

    emptyButtonText: {
      fontSize: 12,
      fontWeight: "800",
      color: "#FFFFFF",
    },
  });