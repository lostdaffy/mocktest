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
import { LinearGradient } from "expo-linear-gradient";

import api from "../api/client";

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
   PYQ YEAR LIST
========================================================= */

export default function PyqYearListScreen({
  route,
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const {
    examStage,
    examName,
  } = route.params;

  const [years, setYears] =
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
     LOAD YEARS
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            `/tests/pyq/${encodeURIComponent(
              examStage
            )}/years`
          );

        setYears(
          res.data?.years || []
        );
      } catch (err) {
        console.log(
          "PYQ years loading error:",
          err
        );

        setYears([]);
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
     STATS
  ======================================================= */

  const stats = useMemo(() => {
    const totalPapers =
      years.reduce(
        (sum, year) =>
          sum +
          Number(year.count || 0),
        0
      );

    const latestYear =
      years.length > 0
        ? Math.max(
            ...years.map((item) =>
              Number(item.year)
            )
          )
        : null;

    return {
      totalPapers,
      totalYears: years.length,
      latestYear,
    };
  }, [years]);

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
            color={colors.brand}
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
        data={years}
        keyExtractor={(item) =>
          String(item.year)
        }
        numColumns={2}
        columnWrapperStyle={
          styles.columnWrapper
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
                    styles.heroCircleOne
                  }
                />

                <View
                  style={
                    styles.heroCircleTwo
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
                    Master past papers
                  </Text>

                  <Text
                    style={
                      styles.heroSubtitle
                    }
                  >
                    Practice real exam papers
                    year by year.
                  </Text>
                </View>

                <View
                  style={
                    styles.heroIcon
                  }
                >
                  <Ionicons
                    name="documents-outline"
                    size={29}
                    color="#FFFFFF"
                  />
                </View>
              </LinearGradient>
            </View>

            {/* =============================================
                STATS
            ============================================= */}

            {years.length > 0 && (
              <View
                style={
                  styles.statsCard
                }
              >
                <StatItem
                  icon="calendar-outline"
                  value={
                    stats.totalYears
                  }
                  label="Years"
                />

                <View
                  style={
                    styles.statDivider
                  }
                />

                <StatItem
                  icon="document-text-outline"
                  value={
                    stats.totalPapers
                  }
                  label="Papers"
                />

                <View
                  style={
                    styles.statDivider
                  }
                />

                <StatItem
                  icon="trending-up-outline"
                  value={
                    stats.latestYear ||
                    "—"
                  }
                  label="Latest"
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
                  Choose a year
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Select a year to view
                  available papers
                </Text>
              </View>

              {years.length > 0 && (
                <View
                  style={
                    styles.yearCountBadge
                  }
                >
                  <Text
                    style={
                      styles.yearCountNumber
                    }
                  >
                    {years.length}
                  </Text>

                  <Text
                    style={
                      styles.yearCountLabel
                    }
                  >
                    YEARS
                  </Text>
                </View>
              )}
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
          <YearCard
            item={item}
            index={index}
            onPress={() =>
              navigation.navigate(
                "PyqPapers",
                {
                  examStage,
                  examName,
                  year: item.year,
                }
              )
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
          color={colors.brand}
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
   YEAR CARD
========================================================= */

function YearCard({
  item,
  index,
  onPress,
}) {
  const count =
    Number(item.count || 0);

  return (
    <TouchableOpacity
      style={
        styles.yearCard
      }
      activeOpacity={0.78}
      onPress={onPress}
    >
      {/* TOP */}

      <View
        style={
          styles.yearTop
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
            styles.yearIcon
          }
        >
          <Text
            style={
              styles.yearText
            }
          >
            {item.year}
          </Text>
        </LinearGradient>

        <View
          style={
            styles.arrowCircle
          }
        >
          <Ionicons
            name="chevron-forward"
            size={13}
            color={
              colors.slate
            }
          />
        </View>
      </View>

      {/* CONTENT */}

      <View
        style={
          styles.yearContent
        }
      >
        <Text
          style={
            styles.paperCount
          }
        >
          {count}
        </Text>

        <Text
          style={
            styles.paperLabel
          }
        >
          Paper
          {count !== 1
            ? "s"
            : ""}
        </Text>
      </View>

      {/* FOOTER */}

      <View
        style={
          styles.cardFooter
        }
      >
        <View
          style={
            styles.availableDot
          }
        />

        <Text
          style={
            styles.availableText
          }
        >
          Available
        </Text>
      </View>
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
            name="documents-outline"
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
        No papers yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Previous year papers for
        this exam haven't been
        added yet. Check back soon.
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
      fontSize: 19,
      lineHeight: 24,
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
      maxWidth: 220,
    },

    heroIcon: {
      width: 61,
      height: 61,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.12)",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 10,
      zIndex: 2,
    },

    heroCircleOne: {
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

    heroCircleTwo: {
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

    yearCountBadge: {
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

    yearCountNumber: {
      fontSize: 13,
      fontWeight: "900",
      color: colors.brand,
    },

    yearCountLabel: {
      fontSize: 6.5,
      fontWeight: "800",
      color:
        colors.slateSoft,
      marginTop: 1,
      letterSpacing: 0.3,
    },

    /* =====================================================
       COLUMN
    ===================================================== */

    columnWrapper: {
      paddingHorizontal: 18,
      gap: 10,
      marginBottom: 10,
    },

    /* =====================================================
       YEAR CARD
    ===================================================== */

    yearCard: {
      ...card,
      flex: 1,
      minHeight: 145,
      padding: 12,
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        "#FFFFFF",
      overflow: "hidden",
    },

    yearTop: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },

    yearIcon: {
      width: 58,
      height: 58,
      borderRadius: 17,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.brand,
    },

    yearText: {
      fontSize: 16,
      lineHeight: 20,
      fontWeight: "900",
      color: "#FFFFFF",
      letterSpacing: -0.3,
    },

    arrowCircle: {
      width: 27,
      height: 27,
      borderRadius: 14,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    yearContent: {
      flexDirection:
        "row",
      alignItems:
        "baseline",
      marginTop: 13,
    },

    paperCount: {
      fontSize: 19,
      lineHeight: 23,
      fontWeight: "900",
      color: colors.ink,
    },

    paperLabel: {
      fontSize: 10,
      fontWeight: "600",
      color:
        colors.slateSoft,
      marginLeft: 4,
    },

    cardFooter: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 8,
    },

    availableDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        colors.success,
      marginRight: 5,
    },

    availableText: {
      fontSize: 8.5,
      fontWeight: "700",
      color:
        colors.success,
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