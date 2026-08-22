import {
  useCallback,
  useLayoutEffect,
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

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
} from "../theme/theme";

/* =========================================================
   EXAM META
========================================================= */

const EXAM_META = {
  SSC_CGL: {
    icon: "school",
    grad: ["#4F6EF7", "#3048D8"],
    bg: "#EEF2FF",
  },

  SSC_MTS: {
    icon: "briefcase",
    grad: ["#18C98A", "#079B68"],
    bg: "#ECFDF5",
  },

  SSC_CHSL: {
    icon: "document-text",
    grad: ["#A879F8", "#7335D8"],
    bg: "#F5F3FF",
  },

  UP_POLICE: {
    icon: "shield-checkmark",
    grad: ["#F66D70", "#D92E38"],
    bg: "#FEF2F2",
  },

  RAILWAY: {
    icon: "train",
    grad: ["#FB9B50", "#E76518"],
    bg: "#FFF7ED",
  },

  BANKING: {
    icon: "card",
    grad: ["#32D5E8", "#078CA5"],
    bg: "#ECFEFF",
  },

  CTET: {
    icon: "person",
    grad: ["#F47CB5", "#D82C78"],
    bg: "#FDF2F8",
  },
};

/* =========================================================
   DEFAULT META
========================================================= */

const DEFAULT_META = {
  icon: "document-text",
  grad: ["#4F6EF7", "#3048D8"],
  bg: "#EEF2FF",
};

/* =========================================================
   SCREEN
========================================================= */

export default function PyqExamPickerScreen({
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

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

        const data =
          res.data?.patterns ||
          res.data?.exams ||
          [];

        setExams(
          Array.isArray(data)
            ? data
            : []
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
          Loading previous papers
        </Text>

        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Preparing your exam list...
        </Text>
      </View>
    );
  }

  /* =======================================================
     OPEN EXAM
  ======================================================= */

  function openExam(item) {
    navigation.navigate(
      "PyqYears",
      {
        examStage:
          item.examType,

        examName:
          item.displayName ||
          item.examType,
      }
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
        keyExtractor={(
          item,
          index
        ) =>
          item.examType ||
          item._id ||
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
            10,
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
                  Previous Year Papers
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                  numberOfLines={1}
                >
                  Practice from real exam papers
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.headerButton
                }
                activeOpacity={
                  0.75
                }
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
                  "#0C115F",
                  "#2114B7",
                  "#5521E8",
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
                    styles.heroGlowOne
                  }
                />

                <View
                  style={
                    styles.heroGlowTwo
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
                    Solve real exam questions
                    and understand the pattern
                    before your exam.
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
                      styles.heroPaper
                    }
                  >
                    <Ionicons
                      name="document-text"
                      size={29}
                      color="#FFFFFF"
                    />

                    <View
                      style={
                        styles.heroPaperLine
                      }
                    />

                    <View
                      style={
                        styles.heroPaperLineShort
                      }
                    />

                    <View
                      style={
                        styles.heroCheck
                      }
                    >
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>

                  <View
                    style={
                      styles.heroFloating
                    }
                  >
                    <Ionicons
                      name="trophy"
                      size={17}
                      color="#FFD84D"
                    />
                  </View>
                </View>
              </LinearGradient>
            </View>

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
                  Choose Your Exam
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Select an exam to browse
                  previous papers
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
              openExam(item)
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
    ] || DEFAULT_META;

  const name =
    item.displayName ||
    item.examType ||
    "Exam";

  return (
    <TouchableOpacity
      style={
        styles.examCard
      }
      activeOpacity={0.78}
      onPress={onPress}
    >
      {/* Left accent */}

      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor:
              meta.grad[0],
          },
        ]}
      />

      {/* Exam icon */}

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
          size={21}
          color="#FFFFFF"
        />
      </LinearGradient>

      {/* Content */}

      <View
        style={
          styles.examContent
        }
      >
        <View
          style={
            styles.examTitleRow
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

          <View
            style={[
              styles.numberBadge,
              {
                backgroundColor:
                  meta.bg,
              },
            ]}
          >
            <Text
              style={[
                styles.numberText,
                {
                  color:
                    meta.grad[1],
                },
              ]}
            >
              {String(
                index + 1
              ).padStart(2, "0")}
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.examSubtitle
          }
          numberOfLines={1}
        >
          Previous year papers
        </Text>

        <View
          style={
            styles.examMeta
          }
        >
          <Ionicons
            name="calendar-outline"
            size={11}
            color={
              colors.slateSoft
            }
          />

          <Text
            style={
              styles.examMetaText
            }
          >
            Year-wise papers
          </Text>
        </View>
      </View>

      {/* Arrow */}

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
        No exams available
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        Previous year papers are
        being added. Please check
        again shortly.
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
      minHeight: 58,
      paddingHorizontal: 18,
      paddingBottom: 14,
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
      lineHeight: 23,
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
      marginTop: 1,
      fontWeight: "500",
    },

    /* =====================================================
       HERO
    ===================================================== */

    heroWrap: {
      marginHorizontal: 18,
      marginBottom: 22,
    },

    hero: {
      minHeight: 172,
      borderRadius: 23,
      paddingHorizontal: 18,
      paddingVertical: 18,
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
      marginBottom: 9,
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
      width: 91,
      height: 120,
      alignItems:
        "center",
      justifyContent:
        "center",
      position:
        "relative",
      marginLeft: 7,
    },

    heroPaper: {
      width: 64,
      height: 79,
      borderRadius: 16,
      backgroundColor:
        "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.25)",
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "7deg",
        },
      ],
      position:
        "relative",
    },

    heroPaperLine: {
      width: 29,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        "rgba(255,255,255,0.45)",
      marginTop: 8,
    },

    heroPaperLineShort: {
      width: 20,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        "rgba(255,255,255,0.28)",
      marginTop: 5,
    },

    heroCheck: {
      position:
        "absolute",
      right: 5,
      bottom: 6,
      width: 19,
      height: 19,
      borderRadius: 10,
      backgroundColor:
        "#10B981",
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    heroFloating: {
      position:
        "absolute",
      width: 38,
      height: 38,
      borderRadius: 13,
      right: 0,
      bottom: 7,
      backgroundColor:
        "rgba(255,255,255,0.13)",
      borderWidth: 1,
      borderColor:
        "rgba(255,255,255,0.16)",
      alignItems:
        "center",
      justifyContent:
        "center",
      transform: [
        {
          rotate: "-7deg",
        },
      ],
    },

    heroGlowOne: {
      position:
        "absolute",
      width: 210,
      height: 210,
      borderRadius: 105,
      right: -95,
      top: -100,
      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroGlowTwo: {
      position:
        "absolute",
      width: 120,
      height: 120,
      borderRadius: 60,
      left: -60,
      bottom: -75,
      backgroundColor:
        "rgba(255,255,255,0.06)",
    },

    heroRing: {
      position:
        "absolute",
      width: 180,
      height: 180,
      borderRadius: 90,
      borderWidth: 20,
      borderColor:
        "rgba(255,255,255,0.035)",
      right: -75,
      bottom: -85,
      transform: [
        {
          rotate: "20deg",
        },
      ],
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
      fontWeight: "500",
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
       EXAM CARD
    ===================================================== */

    examCard: {
      marginHorizontal: 18,
      marginBottom: 10,
      minHeight: 82,
      paddingVertical: 10,
      paddingHorizontal: 11,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      borderWidth: 1,
      borderColor:
        colors.border,
      flexDirection:
        "row",
      alignItems:
        "center",
      overflow: "hidden",
      ...shadow.soft,
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
      width: 48,
      height: 48,
      borderRadius: 15,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 3,
      marginRight: 11,
    },

    examContent: {
      flex: 1,
      minWidth: 0,
    },

    examTitleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      minWidth: 0,
    },

    examName: {
      flex: 1,
      minWidth: 0,
      fontSize: 14.5,
      lineHeight: 19,
      fontWeight: "850",
      color:
        colors.ink,
    },

    numberBadge: {
      width: 29,
      height: 23,
      borderRadius: 8,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 7,
    },

    numberText: {
      fontSize: 8.5,
      fontWeight: "900",
    },

    examSubtitle: {
      fontSize: 10,
      lineHeight: 14,
      color:
        colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    examMeta: {
      flexDirection:
        "row",
      alignItems:
        "center",
      gap: 4,
      marginTop: 5,
    },

    examMetaText: {
      fontSize: 8.5,
      lineHeight: 11,
      color:
        colors.slateSoft,
      fontWeight: "600",
    },

    actionButton: {
      width: 36,
      height: 36,
      borderRadius: 13,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 8,
    },

    /* =====================================================
       EMPTY STATE
    ===================================================== */

    empty: {
      alignItems:
        "center",
      paddingHorizontal: 28,
      paddingVertical: 50,
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
      width: 26,
      height: 26,
      borderRadius: 13,
      right: -3,
      top: -3,
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