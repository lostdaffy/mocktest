import {
  useCallback,
  useMemo,
  useState,
  useLayoutEffect,
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

import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getColors,
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
    icon: "school-outline",
  },

  SSC_MTS: {
    icon: "briefcase-outline",
  },

  SSC_CHSL: {
    icon: "document-text-outline",
  },

  UP_POLICE: {
    icon: "shield-checkmark-outline",
  },

  RAILWAY: {
    icon: "train-outline",
  },

  BANKING: {
    icon: "card-outline",
  },

  CTET: {
    icon: "person-outline",
  },
};


/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ExamPickerScreen({
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


  const { user } =
    useAuth();


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

  const load =
    useCallback(async () => {
      setLoading(true);

      try {
        const res =
          await api.get(
            "/exams"
          );

        setExams(
          res.data?.patterns ||
            res.data?.exams ||
            []
        );
      } catch (err) {
        console.log(
          "Exam loading error:",
          err
        );

        setExams([]);
      } finally {
        setLoading(false);
      }
    }, []);


  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );


  /* =======================================================
     USER EXAM
  ======================================================= */

  const myGoal =
    user?.examGoals?.[0];


  const featured =
    useMemo(() => {
      return (
        exams.find(
          (exam) =>
            exam.examType ===
            myGoal
        ) || null
      );
    }, [
      exams,
      myGoal,
    ]);


  const rest =
    useMemo(() => {
      return exams.filter(
        (exam) =>
          exam.examType !==
          featured?.examType
      );
    }, [
      exams,
      featured,
    ]);


  /* =======================================================
     NAVIGATION
  ======================================================= */

  function goTo(item) {
    navigation.navigate(
      "ExamSeries",
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
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <View
        style={[
          styles.centered,
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
            styles.loaderIcon,
            {
              backgroundColor:
                colors.brandTint,
              borderColor:
                colors.brandLight,
            },
          ]}
        >
          <Ionicons
            name="layers-outline"
            size={23}
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
      style={[
        styles.screen,
        {
          backgroundColor:
            colors.bg,
        },
      ]}
    >
      <FlatList
        data={rest}
        keyExtractor={(item) =>
          item.examType
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
                activeOpacity={
                  0.72
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
                  styles.headerCopy
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
                >
                  Mock Tests
                </Text>

                <Text
                  style={[
                    styles.headerSubtitle,
                    {
                      color:
                        colors.slate,
                    },
                  ]}
                >
                  Test your exam readiness
                </Text>
              </View>


              <View
                style={[
                  styles.headerCount,
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
                    styles.headerCountNumber,
                    {
                      color:
                        colors.brand,
                    },
                  ]}
                >
                  {exams.length}
                </Text>

                <Text
                  style={[
                    styles.headerCountLabel,
                    {
                      color:
                        colors.slate,
                    },
                  ]}
                >
                  EXAMS
                </Text>
              </View>
            </View>


            {/* =================================================
                HERO
            ================================================= */}

            <View
              style={[
                styles.hero,
                {
                  backgroundColor:
                    colors.brand,
                  shadowColor:
                    colors.brand,
                },
              ]}
            >
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
                  styles.heroContent
                }
              >
                <View
                  style={
                    styles.heroEyebrow
                  }
                >
                  <View
                    style={
                      styles.heroDot
                    }
                  />

                  <Text
                    style={
                      styles.heroEyebrowText
                    }
                  >
                    EXAM PRACTICE
                  </Text>
                </View>


                <Text
                  style={
                    styles.heroTitle
                  }
                >
                  Practice like the{"\n"}
                  real exam.
                </Text>


                <Text
                  style={
                    styles.heroText
                  }
                >
                  Full-length mock tests
                  designed around your
                  exam pattern.
                </Text>


                <View
                  style={
                    styles.heroFeatures
                  }
                >
                  <MiniFeature
                    icon="document-text-outline"
                    text="Full Length"
                  />

                  <MiniFeature
                    icon="timer-outline"
                    text="Timed"
                  />

                  <MiniFeature
                    icon="analytics-outline"
                    text="Analysis"
                  />
                </View>
              </View>


              <View
                style={
                  styles.heroVisual
                }
              >
                <View
                  style={
                    styles.heroVisualCircle
                  }
                >
                  <Ionicons
                    name="document-text-outline"
                    size={37}
                    color="#FFFFFF"
                  />
                </View>

                <View
                  style={
                    styles.heroVisualBadge
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={12}
                    color={
                      colors.success
                    }
                  />
                </View>
              </View>
            </View>


            {/* =================================================
                YOUR EXAM
            ================================================= */}

            {featured && (
              <>
                <SectionHeader
                  title="Your Exam"
                  subtitle="Start where your preparation matters most"
                  colors={
                    colors
                  }
                />

                <FeaturedExamCard
                  exam={
                    featured
                  }
                  colors={
                    colors
                  }
                  onPress={() =>
                    goTo(
                      featured
                    )
                  }
                />
              </>
            )}


            {/* =================================================
                OTHER EXAMS
            ================================================= */}

            {rest.length > 0 && (
              <View
                style={
                  styles.allExamHeader
                }
              >
                <View
                  style={
                    styles.allExamCopy
                  }
                >
                  <Text
                    style={[
                      styles.allExamTitle,
                      {
                        color:
                          colors.ink,
                      },
                    ]}
                  >
                    {featured
                      ? "Explore Other Exams"
                      : "Choose Your Exam"}
                  </Text>

                  <Text
                    style={[
                      styles.allExamSubtitle,
                      {
                        color:
                          colors.slateSoft,
                      },
                    ]}
                  >
                    Select an exam to explore
                    mock series
                  </Text>
                </View>

                <View
                  style={[
                    styles.examCount,
                    {
                      backgroundColor:
                        colors.surface,
                      borderColor:
                        colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.examCountNumber,
                      {
                        color:
                          colors.brand,
                      },
                    ]}
                  >
                    {rest.length}
                  </Text>

                  <Text
                    style={[
                      styles.examCountLabel,
                      {
                        color:
                          colors.slateSoft,
                      },
                    ]}
                  >
                    EXAMS
                  </Text>
                </View>
              </View>
            )}
          </>
        }


        /* =================================================
           EMPTY
        ================================================= */

        ListEmptyComponent={
          !featured ? (
            <EmptyState
              colors={
                colors
              }
            />
          ) : null
        }


        /* =================================================
           EXAM LIST
        ================================================= */

        renderItem={({
          item,
        }) => (
          <ExamCard
            item={
              item
            }
            colors={
              colors
            }
            onPress={() =>
              goTo(item)
            }
          />
        )}
      />
    </View>
  );
}


/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  title,
  subtitle,
  colors,
}) {
  return (
    <View
      style={
        styles.sectionHeader
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
        {title}
      </Text>

      <Text
        style={[
          styles.sectionSubtitle,
          {
            color:
              colors.slateSoft,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}


/* =========================================================
   MINI FEATURE
========================================================= */

function MiniFeature({
  icon,
  text,
}) {
  return (
    <View
      style={
        styles.miniFeature
      }
    >
      <View
        style={
          styles.miniFeatureIcon
        }
      >
        <Ionicons
          name={icon}
          size={12}
          color="#FFFFFF"
        />
      </View>

      <Text
        style={
          styles.miniFeatureText
        }
      >
        {text}
      </Text>
    </View>
  );
}


/* =========================================================
   FEATURED EXAM
========================================================= */

function FeaturedExamCard({
  exam,
  colors,
  onPress,
}) {
  const meta =
    EXAM_META[
      exam.examType
    ] || {
      icon: "book-outline",
    };


  const totalQs =
    exam.sections?.reduce(
      (
        sum,
        section
      ) =>
        sum +
        (
          section.questionCount ||
          0
        ),
      0
    );


  return (
    <TouchableOpacity
      style={[
        styles.featuredCard,
        {
          backgroundColor:
            colors.surface,
          borderColor:
            colors.border,
          shadowColor:
            colors.brand,
        },
      ]}
      activeOpacity={
        0.86
      }
      onPress={
        onPress
      }
    >

      <View
        style={[
          styles.featuredAccent,
          {
            backgroundColor:
              colors.brand,
          },
        ]}
      />


      {/* ICON */}

      <View
        style={[
          styles.featuredIconBox,
          {
            backgroundColor:
              colors.brandTint,
          },
        ]}
      >
        <View
          style={[
            styles.featuredIcon,
            {
              backgroundColor:
                colors.brand,
            },
          ]}
        >
          <Ionicons
            name={
              meta.icon
            }
            size={25}
            color="#FFFFFF"
          />
        </View>
      </View>


      {/* CONTENT */}

      <View
        style={
          styles.featuredContent
        }
      >
        <View
          style={[
            styles.targetBadge,
            {
              backgroundColor:
                colors.warnLight,
            },
          ]}
        >
          <Ionicons
            name="star"
            size={9}
            color={
              colors.warn
            }
          />

          <Text
            style={[
              styles.targetBadgeText,
              {
                color:
                  colors.warn,
              },
            ]}
          >
            YOUR TARGET EXAM
          </Text>
        </View>


        <Text
          style={[
            styles.featuredTitle,
            {
              color:
                colors.ink,
            },
          ]}
          numberOfLines={2}
        >
          {exam.displayName ||
            exam.examType}
        </Text>


        <View
          style={
            styles.featuredMeta
          }
        >
          {totalQs > 0 && (
            <Meta
              icon="help-circle-outline"
              text={`${totalQs} Questions`}
              colors={
                colors
              }
            />
          )}

          {exam.durationMinutes && (
            <Meta
              icon="time-outline"
              text={`${exam.durationMinutes} min`}
              colors={
                colors
              }
            />
          )}
        </View>


        <View
          style={[
            styles.featuredButton,
            {
              backgroundColor:
                colors.brand,
            },
          ]}
        >
          <Text
            style={
              styles.featuredButtonText
            }
          >
            Browse Mock Series
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
   META
========================================================= */

function Meta({
  icon,
  text,
  colors,
}) {
  return (
    <View
      style={
        styles.metaItem
      }
    >
      <Ionicons
        name={icon}
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
        {text}
      </Text>
    </View>
  );
}


/* =========================================================
   EXAM CARD
========================================================= */

function ExamCard({
  item,
  colors,
  onPress,
}) {
  const meta =
    EXAM_META[
      item.examType
    ] || {
      icon: "book-outline",
    };


  const totalQs =
    item.sections?.reduce(
      (
        sum,
        section
      ) =>
        sum +
        (
          section.questionCount ||
          0
        ),
      0
    );


  return (
    <TouchableOpacity
      style={[
        styles.examCard,
        {
          backgroundColor:
            colors.surface,

          borderColor:
            colors.border,
        },
      ]}
      activeOpacity={
        0.82
      }
      onPress={
        onPress
      }
    >

      {/* ICON */}

      <View
        style={[
          styles.examIconBox,
          {
            backgroundColor:
              colors.brandTint,
          },
        ]}
      >
        <View
          style={[
            styles.examIcon,
            {
              backgroundColor:
                colors.brand,
            },
          ]}
        >
          <Ionicons
            name={
              meta.icon
            }
            size={21}
            color="#FFFFFF"
          />
        </View>
      </View>


      {/* CONTENT */}

      <View
        style={
          styles.examContent
        }
      >
        <Text
          style={[
            styles.examName,
            {
              color:
                colors.ink,
            },
          ]}
          numberOfLines={1}
        >
          {item.displayName ||
            item.examType}
        </Text>

        <View
          style={
            styles.examMeta
          }
        >
          {totalQs > 0 && (
            <Meta
              icon="help-circle-outline"
              text={`${totalQs} Questions`}
              colors={
                colors
              }
            />
          )}

          {item.durationMinutes && (
            <Meta
              icon="time-outline"
              text={`${item.durationMinutes} min`}
              colors={
                colors
              }
            />
          )}
        </View>
      </View>


      {/* ARROW */}

      <View
        style={[
          styles.examArrow,
          {
            backgroundColor:
              colors.slateLight,
          },
        ]}
      >
        <Ionicons
          name="chevron-forward"
          size={16}
          color={
            colors.slate
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
  colors,
}) {
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
              colors.brandTint,
            borderColor:
              colors.brandLight,
          },
        ]}
      >
        <Ionicons
          name="document-outline"
          size={27}
          color={
            colors.brand
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
        No exams available
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
        New mock test series will
        appear here when available.
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
       SCREEN
    ===================================================== */

    screen: {
      flex: 1,
    },

    centered: {
      flex: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    loaderIcon: {
      width: 56,
      height: 56,

      borderRadius: 18,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginBottom: 13,
    },

    loadingText: {
      ...type.small,

      fontSize: 12,

      marginTop: 8,
    },


    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      minHeight: 82,

      paddingHorizontal:
        spacing.lg,

      paddingBottom:
        spacing.sm,

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 11,
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

    headerCopy: {
      flex: 1,

      minWidth: 0,
    },

    headerTitle: {
      ...type.h1,

      fontSize: 21,

      lineHeight: 25,

      letterSpacing:
        -0.4,
    },

    headerSubtitle: {
      ...type.small,

      fontSize: 11,

      lineHeight: 15,

      marginTop: 2,
    },

    headerCount: {
      minWidth: 49,

      height: 40,

      borderRadius: 13,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    headerCountNumber: {
      fontSize: 13,

      lineHeight: 15,

      fontWeight:
        "800",
    },

    headerCountLabel: {
      fontSize: 6.5,

      lineHeight: 9,

      fontWeight:
        "800",

      letterSpacing:
        0.3,

      marginTop: 1,
    },


    /* =====================================================
       HERO
    ===================================================== */

    hero: {
      marginHorizontal:
        spacing.lg,

      minHeight: 190,

      borderRadius:
        radius.xl,

      paddingHorizontal: 18,

      paddingVertical: 18,

      flexDirection:
        "row",

      alignItems:
        "center",

      overflow:
        "hidden",

      marginBottom:
        spacing.lg,

      ...shadow.brand,
    },

    heroContent: {
      flex: 1,

      minWidth: 0,

      zIndex: 5,
    },

    heroEyebrow: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 5,

      marginBottom: 7,
    },

    heroDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        "rgba(255,255,255,0.9)",
    },

    heroEyebrowText: {
      fontSize: 8.5,

      lineHeight: 11,

      fontWeight:
        "800",

      color:
        "rgba(255,255,255,0.78)",

      letterSpacing:
        0.55,
    },

    heroTitle: {
      fontSize: 24,

      lineHeight: 29,

      fontWeight:
        "800",

      color: "#FFFFFF",

      letterSpacing:
        -0.5,
    },

    heroText: {
      fontSize: 11.5,

      lineHeight: 17,

      color:
        "rgba(255,255,255,0.72)",

      maxWidth: 220,

      marginTop: 6,
    },

    heroFeatures: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 9,

      marginTop: 13,
    },

    miniFeature: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,
    },

    miniFeatureIcon: {
      width: 21,

      height: 21,

      borderRadius: 7,

      backgroundColor:
        "rgba(255,255,255,0.15)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    miniFeatureText: {
      fontSize: 8,

      fontWeight:
        "700",

      color:
        "rgba(255,255,255,0.78)",
    },

    heroVisual: {
      width: 105,

      height: 145,

      alignItems:
        "center",

      justifyContent:
        "center",

      position:
        "relative",

      marginLeft: 4,
    },

    heroVisualCircle: {
      width: 82,

      height: 82,

      borderRadius: 41,

      backgroundColor:
        "rgba(255,255,255,0.13)",

      borderWidth: 1,

      borderColor:
        "rgba(255,255,255,0.15)",

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    heroVisualBadge: {
      position:
        "absolute",

      right: 3,

      bottom: 23,

      width: 29,

      height: 29,

      borderRadius: 15,

      backgroundColor:
        "#FFFFFF",

      alignItems:
        "center",

      justifyContent:
        "center",

      ...shadow.soft,
    },

    heroGlowOne: {
      position:
        "absolute",

      width: 170,

      height: 170,

      borderRadius: 85,

      right: -85,

      top: -75,

      backgroundColor:
        "rgba(255,255,255,0.08)",
    },

    heroGlowTwo: {
      position:
        "absolute",

      width: 100,

      height: 100,

      borderRadius: 50,

      left: 90,

      bottom: -75,

      backgroundColor:
        "rgba(255,255,255,0.06)",
    },


    /* =====================================================
       SECTION
    ===================================================== */

    sectionHeader: {
      paddingHorizontal:
        spacing.lg,

      marginBottom: 11,
    },

    sectionTitle: {
      ...type.h3,

      fontSize: 19,

      lineHeight: 23,
    },

    sectionSubtitle: {
      ...type.small,

      fontSize: 10.5,

      lineHeight: 15,

      marginTop: 2,
    },


    /* =====================================================
       FEATURED CARD
    ===================================================== */

    featuredCard: {
      marginHorizontal:
        spacing.lg,

      marginBottom:
        spacing.lg,

      padding: 14,

      borderRadius:
        radius.xl,

      borderWidth: 1,

      flexDirection:
        "row",

      overflow:
        "hidden",

      ...shadow.soft,
    },

    featuredAccent: {
      position:
        "absolute",

      left: 0,

      top: 12,

      bottom: 12,

      width: 3,

      borderTopRightRadius: 3,

      borderBottomRightRadius: 3,
    },

    featuredIconBox: {
      width: 66,

      height: 66,

      borderRadius: 19,

      alignItems:
        "center",

      justifyContent:
        "center",

      marginTop: 2,
    },

    featuredIcon: {
      width: 50,

      height: 50,

      borderRadius: 16,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    featuredContent: {
      flex: 1,

      minWidth: 0,

      marginLeft: 12,
    },

    targetBadge: {
      alignSelf:
        "flex-start",

      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 4,

      paddingHorizontal: 7,

      paddingVertical: 3.5,

      borderRadius:
        radius.full,

      marginBottom: 5,
    },

    targetBadgeText: {
      fontSize: 7.5,

      lineHeight: 10,

      fontWeight:
        "800",

      letterSpacing:
        0.3,
    },

    featuredTitle: {
      fontSize: 17,

      lineHeight: 22,

      fontWeight:
        "800",

      letterSpacing:
        -0.2,

      marginBottom: 6,
    },

    featuredMeta: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 12,

      marginBottom: 10,
    },

    featuredButton: {
      minHeight: 36,

      borderRadius: 11,

      paddingHorizontal: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "center",

      gap: 6,
    },

    featuredButtonText: {
      fontSize: 10.5,

      lineHeight: 14,

      fontWeight:
        "800",

      color: "#FFFFFF",
    },


    /* =====================================================
       ALL EXAMS
    ===================================================== */

    allExamHeader: {
      marginHorizontal:
        spacing.lg,

      marginBottom: 11,

      flexDirection:
        "row",

      alignItems:
        "center",

      justifyContent:
        "space-between",
    },

    allExamCopy: {
      flex: 1,

      minWidth: 0,

      paddingRight: 10,
    },

    allExamTitle: {
      ...type.h3,

      fontSize: 19,

      lineHeight: 23,
    },

    allExamSubtitle: {
      ...type.small,

      fontSize: 10.5,

      lineHeight: 15,

      marginTop: 2,
    },

    examCount: {
      minWidth: 48,

      height: 39,

      borderRadius: 13,

      borderWidth: 1,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    examCountNumber: {
      fontSize: 13,

      lineHeight: 15,

      fontWeight:
        "800",
    },

    examCountLabel: {
      fontSize: 6.5,

      lineHeight: 9,

      fontWeight:
        "800",

      marginTop: 1,
    },


    /* =====================================================
       EXAM CARD
    ===================================================== */

    examCard: {
      minHeight: 78,

      marginHorizontal:
        spacing.lg,

      marginBottom: 9,

      padding: 11,

      borderRadius:
        radius.lg,

      borderWidth: 1,

      flexDirection:
        "row",

      alignItems:
        "center",

      ...shadow.soft,
    },

    examIconBox: {
      width: 51,

      height: 51,

      borderRadius: 16,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    examIcon: {
      width: 43,

      height: 43,

      borderRadius: 14,

      alignItems:
        "center",

      justifyContent:
        "center",
    },

    examContent: {
      flex: 1,

      minWidth: 0,

      marginLeft: 12,
    },

    examName: {
      ...type.bodyStrong,

      fontSize: 14,

      lineHeight: 19,

      marginBottom: 4,
    },

    examMeta: {
      flexDirection:
        "row",

      alignItems:
        "center",

      gap: 11,
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

      fontWeight:
        "600",
    },

    examArrow: {
      width: 32,

      height: 32,

      borderRadius: 16,

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

      paddingVertical: 55,
    },

    emptyIcon: {
      width: 62,

      height: 62,

      borderRadius: 20,

      borderWidth: 1,

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

      maxWidth: 280,
    },
  });