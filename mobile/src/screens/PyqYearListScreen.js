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
  const insets =
    useSafeAreaInsets();

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
          Array.isArray(
            res.data?.years
          )
            ? res.data.years
            : []
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
        (sum, item) =>
          sum +
          Number(
            item?.count || 0
          ),
        0
      );

    const numericYears =
      years
        .map((item) =>
          Number(item?.year)
        )
        .filter(
          (value) =>
            Number.isFinite(value)
        );

    const latestYear =
      numericYears.length
        ? Math.max(
            ...numericYears
          )
        : null;

    return {
      totalYears:
        years.length,
      totalPapers,
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
          Loading years
        </Text>

        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Preparing previous year papers...
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
        keyExtractor={(item, index) =>
          String(
            item?.year ??
              index
          )
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
                  "#2818C9",
                  "#5926E8",
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
                {/* Decorative elements */}

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

                {/* Hero content */}

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
                    Master Previous
                    {"\n"}
                    Year Papers
                  </Text>

                  <Text
                    style={
                      styles.heroSubtitle
                    }
                  >
                    Practice real exam papers
                    year by year and build
                    confidence.
                  </Text>
                </View>

                {/* Hero artwork */}

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
                        styles.heroArtworkNumber
                      }
                    >
                      {stats.totalYears}
                    </Text>

                    <Text
                      style={
                        styles.heroArtworkLabel
                      }
                    >
                      YEARS
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
                  icon="documents-outline"
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

            {/* =================================================
                SECTION HEADER
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
                  Choose a year
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Select a year to browse
                  available papers
                </Text>
              </View>

              {years.length > 0 && (
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
                    {years.length}
                  </Text>

                  <Text
                    style={
                      styles.countLabel
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
                  year:
                    item.year,
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
   YEAR CARD
========================================================= */

function YearCard({
  item,
  index,
  onPress,
}) {
  const count =
    Number(
      item?.count || 0
    );

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
          colors={[
            "#4F46E5",
            "#7C3AED",
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

      {/* PAPER COUNT */}

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
          {count === 1
            ? "Paper"
            : "Papers"}
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

        <View
          style={
            styles.footerArrow
          }
        >
          <Ionicons
            name="arrow-forward"
            size={10}
            color={
              colors.brand
            }
          />
        </View>
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
          styles.emptyArtwork
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="documents-outline"
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
       HERO ARTWORK
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
      height: 79,
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

    heroArtworkNumber: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "900",
      color: "#FFFFFF",
      marginTop: 4,
    },

    heroArtworkLabel: {
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
       GRID
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
      minHeight: 151,
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
      width: 61,
      height: 61,
      borderRadius: 18,
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
      letterSpacing:
        -0.3,
    },

    arrowCircle: {
      width: 29,
      height: 29,
      borderRadius: 15,
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
      fontSize: 20,
      lineHeight: 24,
      fontWeight: "900",
      color:
        colors.ink,
    },

    paperLabel: {
      fontSize: 10,
      lineHeight: 13,
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
      marginTop: 9,
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
      lineHeight: 11,
      fontWeight: "700",
      color:
        colors.success,
    },

    footerArrow: {
      marginLeft: "auto",
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
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