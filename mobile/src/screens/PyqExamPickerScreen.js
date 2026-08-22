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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
  card,
} from "../theme/theme";

/* =========================================================
   EXAM META
========================================================= */

const EXAM_META = {
  SSC_CGL: {
    icon: "school",
    grad: ["#3B7BFF", "#1053F3"],
    bg: "#EEF3FF",
  },

  SSC_MTS: {
    icon: "briefcase",
    grad: ["#10B981", "#059669"],
    bg: "#ECFDF5",
  },

  SSC_CHSL: {
    icon: "document-text",
    grad: ["#A78BFA", "#7C3AED"],
    bg: "#F5F3FF",
  },

  UP_POLICE: {
    icon: "shield-checkmark",
    grad: ["#F87171", "#DC2626"],
    bg: "#FEF2F2",
  },

  RAILWAY: {
    icon: "train",
    grad: ["#FB923C", "#EA580C"],
    bg: "#FFF7ED",
  },

  BANKING: {
    icon: "card",
    grad: ["#22D3EE", "#0891B2"],
    bg: "#ECFEFF",
  },

  CTET: {
    icon: "person",
    grad: ["#F472B6", "#DB2777"],
    bg: "#FDF2F8",
  },
};

/* =========================================================
   SCREEN
========================================================= */

export default function PyqExamPickerScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const [exams, setExams] =
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
     LOAD EXAMS
  ======================================================= */

  const load = useCallback(
    async () => {
      setLoading(true);

      try {
        const res =
          await api.get("/exams");

        setExams(
          res.data?.patterns ||
          res.data?.exams ||
          []
        );
      } catch (err) {
        console.log(
          "PYQ exams loading error:",
          err
        );

        setExams([]);
      } finally {
        setLoading(false);
      }
    },
    []
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
    return {
      exams: exams.length,
    };
  }, [exams]);

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
          Loading exams...
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
        data={exams}
        keyExtractor={(item) =>
          item.examType
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
                  styles.headerButton
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
                >
                  Previous Year Papers
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Practice from real exam papers
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.headerButton
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
                    Master Previous
                    Papers
                  </Text>

                  <Text
                    style={
                      styles.heroSubtitle
                    }
                  >
                    Choose an exam and
                    practice real questions
                    year by year.
                  </Text>
                </View>

                <View
                  style={
                    styles.heroIcon
                  }
                >
                  <Ionicons
                    name="trophy-outline"
                    size={27}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.heroIconText
                    }
                  >
                    PYQ
                  </Text>
                </View>
              </LinearGradient>
            </View>

         

            {/* =============================================
                SECTION
            ============================================= */}

            <View
              style={
                styles.sectionHeader
              }
            >
              <View
                style={
                  styles.sectionContent
                }
              >
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Choose Your Exam
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Select an exam to browse
                  its previous papers
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
                  {exams.length}
                </Text>

                <Text
                  style={
                    styles.countLabel
                  }
                >
                  EXAMS
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
          <ExamCard
            item={item}
            index={index}
            onPress={() =>
              navigation.navigate(
                "PyqYears",
                {
                  examStage:
                    item.examType,

                  examName:
                    item.displayName ||
                    item.examType,
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
   EXAM CARD
========================================================= */

function ExamCard({
  item,
  index,
  onPress,
}) {
  const meta =
    EXAM_META[
    item.examType
    ] || {
      icon: "document-text",
      grad: [
        "#3B7BFF",
        "#1053F3",
      ],
      bg: "#EEF3FF",
    };

  const name =
    item.displayName ||
    item.examType;

  return (
    <TouchableOpacity
      style={
        styles.examCard
      }
      activeOpacity={0.78}
      onPress={onPress}
    >
      {/* ACCENT */}

      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor:
              meta.grad[0],
          },
        ]}
      />

      {/* ICON */}

      <LinearGradient
        colors={
          meta.grad
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
          styles.examIcon
        }
      >
        <Ionicons
          name={meta.icon}
          size={22}
          color="#FFFFFF"
        />
      </LinearGradient>

      {/* CONTENT */}

      <View
        style={
          styles.examContent
        }
      >
        <View
          style={
            styles.examTopRow
          }
        >
          <Text
            style={
              styles.examName
            }
            numberOfLines={1}
          >
            {name}
          </Text>
        </View>
      </View>

      {/* ACTION */}

      <View
        style={[
          styles.actionButton,
          {
            backgroundColor:
              meta.bg,
          },
        ]}
      >
        <Ionicons
          name="arrow-forward"
          size={16}
          color={
            meta.grad[0]
          }
        />
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY
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
        No exams available
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Previous year papers are
        being added. Check again
        shortly.
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
      fontWeight: "600",
      color:
        colors.slate,
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
      width: 40,
      height: 40,
      borderRadius: 20,
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
      marginHorizontal: 12,
    },

    headerTitle: {
      fontSize: 18,
      lineHeight: 22,
      fontWeight: "800",
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
      marginBottom: 14,
    },

    hero: {
      minHeight: 130,
      borderRadius: 21,
      paddingHorizontal: 17,
      paddingVertical: 16,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.brand,
    },

    heroContent: {
      flex: 1,
      zIndex: 3,
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
      maxWidth: 220,
    },

    heroSubtitle: {
      fontSize: 10.5,
      lineHeight: 15,
      color:
        "rgba(255,255,255,0.78)",
      marginTop: 3,
      maxWidth: 235,
    },

    heroIcon: {
      width: 66,
      height: 66,
      borderRadius: 20,
      backgroundColor:
        "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.14)",
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 10,
      zIndex: 3,
    },

    heroIconText: {
      fontSize: 7,
      fontWeight: "900",
      color:
        "rgba(255,255,255,0.7)",
      marginTop: 2,
      letterSpacing: 0.5,
    },

    heroOrbOne: {
      position:
        "absolute",
      width: 155,
      height: 155,
      borderRadius: 78,
      right: -72,
      top: -85,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroOrbTwo: {
      position:
        "absolute",
      width: 95,
      height: 95,
      borderRadius: 48,
      left: -48,
      bottom: -63,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    /* =====================================================
       INFO CARD
    ===================================================== */

    infoCard: {
      marginHorizontal: 18,
      marginBottom: 21,
      minHeight: 66,
      paddingHorizontal: 12,
      paddingVertical: 10,
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

    infoIcon: {
      width: 33,
      height: 33,
      borderRadius: 11,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    infoContent: {
      flex: 1,
      marginLeft: 7,
    },

    infoValue: {
      fontSize: 13,
      lineHeight: 17,
      fontWeight: "900",
      color:
        colors.ink,
    },

    infoLabel: {
      fontSize: 8.5,
      lineHeight: 11,
      color:
        colors.slateSoft,
      marginTop: 1,
      fontWeight: "600",
    },

    infoDivider: {
      width: 1,
      height: 30,
      backgroundColor:
        colors.border,
      marginHorizontal: 9,
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

    sectionContent: {
      flex: 1,
    },

    sectionTitle: {
      fontSize: 19,
      lineHeight: 23,
      fontWeight: "800",
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

    countNumber: {
      fontSize: 13,
      fontWeight: "900",
      color:
        colors.brand,
    },

    countLabel: {
      fontSize: 6.5,
      fontWeight: "800",
      color:
        colors.slateSoft,
      marginTop: 1,
      letterSpacing: 0.3,
    },

    /* =====================================================
       EXAM CARD
    ===================================================== */

    examCard: {
      ...card,
      minHeight: 86,
      marginHorizontal: 18,
      marginBottom: 10,
      padding: 11,
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      borderWidth: 1,
      borderColor:
        colors.border,
    },

    cardAccent: {
      position:
        "absolute",
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderRadius: 2,
    },

    examIcon: {
      width: 47,
      height: 47,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 2,
      marginRight: 11,
      ...shadow.brand,
    },

    examContent: {
      flex: 1,
      minWidth: 0,
    },

    examTopRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      gap: 7,
    },

    examName: {
      flex: 1,
      fontSize: 15,
      lineHeight: 19,
      fontWeight: "800",
      color:
        colors.ink,
    },

    indexBadge: {
      minWidth: 28,
      height: 22,
      paddingHorizontal: 5,
      borderRadius: 8,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    indexText: {
      fontSize: 8.5,
      fontWeight: "900",
    },

    examSub: {
      fontSize: 9.5,
      lineHeight: 14,
      color:
        colors.slateSoft,
      marginTop: 2,
      fontWeight: "500",
    },

    examMetaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 6,
      gap: 4,
    },

    examMetaText: {
      fontSize: 8.5,
      lineHeight: 11,
      color:
        colors.slateSoft,
      fontWeight: "600",
    },

    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        colors.border,
      marginHorizontal: 3,
    },

    actionButton: {
      width: 35,
      height: 35,
      borderRadius: 18,
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
      color:
        colors.ink,
      marginBottom: 5,
    },

    emptyText: {
      fontSize: 12,
      lineHeight: 18,
      color:
        colors.slate,
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