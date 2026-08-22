import { useCallback, useMemo, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/* =========================================================
   FALLBACK META
========================================================= */

const DEFAULT_META = {
  icon: "book",
  grad: ["#5B5FEF", "#4044D8"],
  light: "#EEF0FF",
  accent: "#5B5FEF",
};

/* =========================================================
   MAIN SCREEN
========================================================= */

export default function ExamPickerScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  /* -------------------------------------------------------
     LOAD EXAMS
  ------------------------------------------------------- */

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const res = await api.get("/exams");

      setExams(
        res.data.patterns ||
          res.data.exams ||
          []
      );
    } catch (err) {
      console.log(
        "Exam loading error:",
        err
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* -------------------------------------------------------
     USER EXAM
  ------------------------------------------------------- */

  const myGoal = user?.examGoals?.[0];

  const featured = useMemo(() => {
    return (
      exams.find(
        (exam) =>
          exam.examType === myGoal
      ) || null
    );
  }, [exams, myGoal]);

  const rest = useMemo(() => {
    return exams.filter(
      (exam) =>
        exam.examType !==
        featured?.examType
    );
  }, [exams, featured]);

  /* -------------------------------------------------------
     LOADING
  ------------------------------------------------------- */

  if (loading) {
    return (
      <View style={styles.centered}>
        <View
          style={styles.loaderCircle}
        >
          <ActivityIndicator
            size="small"
            color="#FF684A"
          />
        </View>

        <Text
          style={styles.loadingText}
        >
          Loading mock tests...
        </Text>
      </View>
    );
  }

  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

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
     RENDER
  ======================================================= */

  return (
    <View
      style={styles.screen}
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
            100 + insets.bottom,
        }}
        ListHeaderComponent={
          <>
            {/* =================================================
                HEADER
            ================================================= */}

            <View
              style={[
                styles.topHeader,
                {
                  paddingTop:
                    Math.max(
                      insets.top,
                      14
                    ),
                },
              ]}
            >
              <TouchableOpacity
                style={
                  styles.backButton
                }
                activeOpacity={0.7}
                onPress={() =>
                  navigation.goBack()
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color="#17202E"
                />
              </TouchableOpacity>

              <View
                style={
                  styles.headerTitleWrap
                }
              >
                <Text
                  style={
                    styles.topHeaderTitle
                  }
                >
                  Mock Tests
                </Text>

                <Text
                  style={
                    styles.headerSub
                  }
                >
                  Test your exam readiness
                </Text>
              </View>

              <View
                style={
                  styles.headerRight
                }
              >
                <Ionicons
                  name="options-outline"
                  size={21}
                  color="#687587"
                />
              </View>
            </View>

            {/* =================================================
                HERO
            ================================================= */}

            <View
              style={styles.heroBanner}
            >
              {/* Background shapes */}

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
                  styles.heroBannerContent
                }
              >
                <View
                  style={
                    styles.heroLabel
                  }
                >
                  <View
                    style={
                      styles.heroLabelDot
                    }
                  />

                  <Text
                    style={
                      styles.heroLabelText
                    }
                  >
                    EXAM PRACTICE
                  </Text>
                </View>

                <Text
                  style={
                    styles.heroBannerTitle
                  }
                >
                  Practice like{"\n"}
                  the real exam.
                </Text>

                <Text
                  style={
                    styles.heroBannerText
                  }
                >
                  Full-length mock tests
                  designed to match your
                  actual exam pattern.
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
                    text="Performance"
                  />
                </View>
              </View>

              {/* Illustration */}

              <View
                style={
                  styles.heroIllustration
                }
              >
                <View
                  style={
                    styles.illustrationCircle
                  }
                />

                <View
                  style={
                    styles.paperCard
                  }
                >
                  <View
                    style={
                      styles.paperTop
                    }
                  >
                    <View
                      style={
                        styles.paperClip
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.paperIconCircle
                    }
                  >
                    <Ionicons
                      name="document-text"
                      size={25}
                      color="#5B5FEF"
                    />
                  </View>

                  <View
                    style={
                      styles.paperLine
                    }
                  />

                  <View
                    style={
                      styles.paperLineShort
                    }
                  />

                  <View
                    style={
                      styles.paperLine
                    }
                  />

                  <View
                    style={
                      styles.paperCheck
                    }
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
                    styles.timerBubble
                  }
                >
                  <Ionicons
                    name="time"
                    size={20}
                    color="#FF684A"
                  />
                </View>

                <View
                  style={
                    styles.starBubble
                  }
                >
                  <Ionicons
                    name="sparkles"
                    size={16}
                    color="#F59E0B"
                  />
                </View>
              </View>
            </View>

            {/* =================================================
                YOUR EXAM
            ================================================= */}

            {featured && (
              <>
                <SectionTitle
                  title="Your Exam"
                  subtitle="Start where your preparation matters most"
                />

                <FeaturedExamCard
                  exam={featured}
                  onPress={() =>
                    goTo(featured)
                  }
                />
              </>
            )}

            {/* =================================================
                ALL EXAMS HEADER
            ================================================= */}

            {rest.length > 0 && (
              <View
                style={
                  styles.allExamHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.allExamTitle
                    }
                  >
                    {featured
                      ? "Explore Other Exams"
                      : "Choose Your Exam"}
                  </Text>

                  <Text
                    style={
                      styles.allExamSubtitle
                    }
                  >
                    Select an exam to
                    explore mock series
                  </Text>
                </View>

                <View
                  style={
                    styles.examCount
                  }
                >
                  <Text
                    style={
                      styles.examCountText
                    }
                  >
                    {rest.length}
                  </Text>

                  <Text
                    style={
                      styles.examCountLabel
                    }
                  >
                    Exams
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
        renderItem={({ item }) => (
          <ExamCard
            item={item}
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
   SECTION TITLE
========================================================= */

function SectionTitle({
  title,
  subtitle,
}) {
  return (
    <View
      style={
        styles.sectionTitleWrap
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
          color="#5B5FEF"
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
  onPress,
}) {
  const meta =
    EXAM_META[
      exam.examType
    ] || DEFAULT_META;

  const totalQs =
    exam.sections?.reduce(
      (sum, section) =>
        sum +
        (section.questionCount ||
          0),
      0
    );

  return (
    <TouchableOpacity
      style={
        styles.featuredCard
      }
      activeOpacity={0.9}
      onPress={onPress}
    >
      {/* Top accent */}

      <View
        style={[
          styles.featuredAccent,
          {
            backgroundColor:
              meta.accent,
          },
        ]}
      />

      {/* Icon */}

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
            size={25}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>

      {/* Content */}

      <View
        style={
          styles.featuredContent
        }
      >
        <View
          style={
            styles.yourExamBadge
          }
        >
          <Ionicons
            name="star"
            size={10}
            color="#FF684A"
          />

          <Text
            style={
              styles.yourExamText
            }
          >
            YOUR TARGET EXAM
          </Text>
        </View>

        <Text
          style={
            styles.featuredTitle
          }
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
          {totalQs ? (
            <Meta
              icon="help-circle-outline"
              text={`${totalQs} Questions`}
            />
          ) : null}

          {exam.durationMinutes ? (
            <Meta
              icon="time-outline"
              text={`${exam.durationMinutes} min`}
            />
          ) : null}
        </View>

        <View
          style={
            styles.featuredButton
          }
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
            size={16}
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
}) {
  return (
    <View
      style={styles.metaItem}
    >
      <Ionicons
        name={icon}
        size={13}
        color="#8A95A5"
      />

      <Text
        style={styles.metaText}
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
  onPress,
}) {
  const meta =
    EXAM_META[
      item.examType
    ] || DEFAULT_META;

  const totalQs =
    item.sections?.reduce(
      (sum, section) =>
        sum +
        (section.questionCount ||
          0),
      0
    );

  return (
    <TouchableOpacity
      style={
        styles.examCard
      }
      activeOpacity={0.84}
      onPress={onPress}
    >
      {/* ICON */}

      <View
        style={[
          styles.examIconBackground,
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
            styles.examIcon
          }
        >
          <Ionicons
            name={meta.icon}
            size={22}
            color="#FFFFFF"
          />
        </LinearGradient>
      </View>

      {/* CONTENT */}

      <View
        style={
          styles.examContent
        }
      >
        <Text
          style={
            styles.examName
          }
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
          {totalQs ? (
            <Meta
              icon="help-circle-outline"
              text={`${totalQs} Questions`}
            />
          ) : null}

          {item.durationMinutes ? (
            <Meta
              icon="time-outline"
              text={`${item.durationMinutes} min`}
            />
          ) : null}
        </View>
      </View>

      {/* ARROW */}

      <View
        style={
          styles.examArrow
        }
      >
        <Ionicons
          name="chevron-forward"
          size={17}
          color="#687587"
        />
      </View>
    </TouchableOpacity>
  );
}

/* =========================================================
   EMPTY STATE
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
          name="document-outline"
          size={28}
          color="#98A2B3"
        />
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
        New mock test series will
        appear here shortly.
      </Text>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  /* =======================================================
     SCREEN
  ======================================================= */

  screen: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FC",
  },

  loaderCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },

  loadingText: {
    fontSize: 12,
    color: "#7A8697",
    fontWeight: "600",
  },

  /* =======================================================
     HEADER
  ======================================================= */

  topHeader: {
    minHeight: 92,

    paddingHorizontal: 20,
    paddingBottom: 15,

    flexDirection: "row",

    alignItems: "flex-end",

    backgroundColor: "#F8F9FC",
  },

  backButton: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#17202E",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,

    elevation: 2,
  },

  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },

  topHeaderTitle: {
    fontSize: 19,
    lineHeight: 23,

    fontWeight: "800",

    color: "#17202E",

    letterSpacing: -0.4,
  },

  headerSub: {
    fontSize: 10.5,

    color: "#8A95A5",

    marginTop: 2,

    fontWeight: "500",
  },

  headerRight: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#17202E",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.04,
    shadowRadius: 6,

    elevation: 2,
  },

  /* =======================================================
     HERO BANNER
  ======================================================= */

  heroBanner: {
    marginHorizontal: 18,

    minHeight: 205,

    borderRadius: 26,

    backgroundColor: "#F0F1FF",

    paddingHorizontal: 20,
    paddingVertical: 20,

    flexDirection: "row",

    overflow: "hidden",

    marginBottom: 24,

    shadowColor: "#5B5FEF",
    shadowOffset: {
      width: 0,
      height: 7,
    },
    shadowOpacity: 0.07,
    shadowRadius: 15,

    elevation: 3,
  },

  heroBannerContent: {
    flex: 1,
    zIndex: 5,

    justifyContent: "center",
  },

  heroLabel: {
    alignSelf: "flex-start",

    flexDirection: "row",

    alignItems: "center",

    gap: 5,

    paddingHorizontal: 8,
    paddingVertical: 5,

    borderRadius: 20,

    backgroundColor:
      "rgba(91,95,239,0.10)",

    marginBottom: 9,
  },

  heroLabelDot: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: "#5B5FEF",
  },

  heroLabelText: {
    fontSize: 8.5,

    fontWeight: "800",

    color: "#5B5FEF",

    letterSpacing: 0.5,
  },

  heroBannerTitle: {
    fontSize: 24,

    lineHeight: 28,

    fontWeight: "800",

    color: "#17202E",

    letterSpacing: -0.5,

    marginBottom: 6,
  },

  heroBannerText: {
    fontSize: 11.5,

    lineHeight: 17,

    color: "#697586",

    maxWidth: 205,
  },

  heroFeatures: {
    flexDirection: "row",

    gap: 9,

    marginTop: 13,
  },

  miniFeature: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,
  },

  miniFeatureIcon: {
    width: 22,
    height: 22,

    borderRadius: 7,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",
  },

  miniFeatureText: {
    fontSize: 8.5,

    fontWeight: "700",

    color: "#6B7280",
  },

  /* =======================================================
     HERO ILLUSTRATION
  ======================================================= */

  heroIllustration: {
    width: 125,

    position: "relative",

    alignItems: "center",

    justifyContent: "center",
  },

  heroOrbOne: {
    position: "absolute",

    width: 155,
    height: 155,

    borderRadius: 78,

    backgroundColor: "#E2E4FF",

    right: -58,
    top: 18,
  },

  heroOrbTwo: {
    position: "absolute",

    width: 88,
    height: 88,

    borderRadius: 44,

    backgroundColor: "#D5D8FF",

    right: -3,
    top: 25,
  },

  illustrationCircle: {
    position: "absolute",

    width: 118,
    height: 118,

    borderRadius: 59,

    backgroundColor:
      "rgba(255,255,255,0.28)",
  },

  paperCard: {
    width: 75,
    height: 96,

    borderRadius: 13,

    backgroundColor: "#FFFFFF",

    borderWidth: 1.5,

    borderColor: "#5B5FEF",

    alignItems: "center",

    paddingTop: 17,

    transform: [
      {
        rotate: "7deg",
      },
    ],

    shadowColor: "#5B5FEF",

    shadowOffset: {
      width: 0,
      height: 7,
    },

    shadowOpacity: 0.16,

    shadowRadius: 9,

    elevation: 5,
  },

  paperTop: {
    position: "absolute",

    top: -7,

    width: 28,
    height: 13,

    borderRadius: 7,

    backgroundColor: "#5B5FEF",

    alignItems: "center",
  },

  paperClip: {
    width: 5,
    height: 5,

    borderRadius: 3,

    backgroundColor: "#FFFFFF",

    marginTop: 3,
  },

  paperIconCircle: {
    width: 35,
    height: 35,

    borderRadius: 18,

    backgroundColor: "#F0F1FF",

    alignItems: "center",
    justifyContent: "center",
  },

  paperLine: {
    width: 38,
    height: 4,

    borderRadius: 3,

    backgroundColor: "#DDE0FF",

    marginTop: 7,
  },

  paperLineShort: {
    width: 26,
    height: 4,

    borderRadius: 3,

    backgroundColor: "#E9EBFF",

    marginTop: 5,
  },

  paperCheck: {
    position: "absolute",

    right: 7,
    bottom: 7,

    width: 18,
    height: 18,

    borderRadius: 9,

    backgroundColor: "#10B981",

    alignItems: "center",
    justifyContent: "center",
  },

  timerBubble: {
    position: "absolute",

    width: 42,
    height: 42,

    borderRadius: 21,

    backgroundColor: "#FFF4EF",

    borderWidth: 3,

    borderColor: "#FFFFFF",

    left: -2,
    bottom: 20,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#FF684A",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,

    elevation: 3,
  },

  starBubble: {
    position: "absolute",

    width: 31,
    height: 31,

    borderRadius: 16,

    backgroundColor: "#FFF8DF",

    borderWidth: 2,

    borderColor: "#FFFFFF",

    right: 0,
    top: 25,

    alignItems: "center",
    justifyContent: "center",
  },

  /* =======================================================
     SECTION TITLE
  ======================================================= */

  sectionTitleWrap: {
    paddingHorizontal: 18,

    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 20,

    fontWeight: "800",

    color: "#17202E",

    letterSpacing: -0.3,
  },

  sectionSubtitle: {
    fontSize: 11.5,

    color: "#8A95A5",

    marginTop: 3,

    lineHeight: 17,
  },

  /* =======================================================
     FEATURED EXAM CARD
  ======================================================= */

  featuredCard: {
    marginHorizontal: 18,

    backgroundColor: "#FFFFFF",

    borderRadius: 23,

    padding: 16,

    flexDirection: "row",

    marginBottom: 26,

    overflow: "hidden",

    shadowColor: "#17202E",

    shadowOffset: {
      width: 0,
      height: 6,
    },

    shadowOpacity: 0.065,

    shadowRadius: 14,

    elevation: 3,
  },

  featuredAccent: {
    position: "absolute",

    left: 0,
    top: 0,
    bottom: 0,

    width: 4,
  },

  featuredIconBox: {
    width: 72,
    height: 72,

    borderRadius: 21,

    alignItems: "center",
    justifyContent: "center",

    marginTop: 3,
  },

  featuredIcon: {
    width: 54,
    height: 54,

    borderRadius: 17,

    alignItems: "center",
    justifyContent: "center",
  },

  featuredContent: {
    flex: 1,

    marginLeft: 13,
  },

  yourExamBadge: {
    alignSelf: "flex-start",

    flexDirection: "row",

    alignItems: "center",

    gap: 4,

    backgroundColor: "#FFF1EC",

    paddingHorizontal: 8,
    paddingVertical: 4,

    borderRadius: 20,

    marginBottom: 6,
  },

  yourExamText: {
    fontSize: 8,

    fontWeight: "800",

    color: "#FF684A",

    letterSpacing: 0.4,
  },

  featuredTitle: {
    fontSize: 18,

    lineHeight: 23,

    fontWeight: "800",

    color: "#17202E",

    marginBottom: 7,
  },

  featuredMeta: {
    flexDirection: "row",

    alignItems: "center",

    gap: 13,

    marginBottom: 12,
  },

  metaItem: {
    flexDirection: "row",

    alignItems: "center",

    gap: 4,
  },

  metaText: {
    fontSize: 10.5,

    color: "#8A95A5",

    fontWeight: "600",
  },

  featuredButton: {
    height: 38,

    borderRadius: 12,

    backgroundColor: "#FF684A",

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "center",

    gap: 7,

    paddingHorizontal: 12,
  },

  featuredButtonText: {
    fontSize: 11.5,

    fontWeight: "800",

    color: "#FFFFFF",
  },

  /* =======================================================
     ALL EXAMS HEADER
  ======================================================= */

  allExamHeader: {
    marginHorizontal: 18,

    marginBottom: 13,

    flexDirection: "row",

    alignItems: "center",

    justifyContent: "space-between",
  },

  allExamTitle: {
    fontSize: 20,

    fontWeight: "800",

    color: "#17202E",

    letterSpacing: -0.3,
  },

  allExamSubtitle: {
    fontSize: 11,

    color: "#8A95A5",

    marginTop: 3,
  },

  examCount: {
    minWidth: 43,

    height: 43,

    borderRadius: 14,

    backgroundColor: "#FFFFFF",

    alignItems: "center",
    justifyContent: "center",

    borderWidth: 1,

    borderColor: "#EEF0F4",
  },

  examCountText: {
    fontSize: 14,

    fontWeight: "800",

    color: "#5B5FEF",

    lineHeight: 16,
  },

  examCountLabel: {
    fontSize: 7.5,

    fontWeight: "700",

    color: "#8A95A5",

    marginTop: 1,
  },

  /* =======================================================
     EXAM CARD
  ======================================================= */

  examCard: {
    minHeight: 82,

    marginHorizontal: 18,

    marginBottom: 11,

    paddingHorizontal: 14,
    paddingVertical: 13,

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    flexDirection: "row",

    alignItems: "center",

    shadowColor: "#17202E",

    shadowOffset: {
      width: 0,
      height: 4,
    },

    shadowOpacity: 0.045,

    shadowRadius: 10,

    elevation: 2,
  },

  examIconBackground: {
    width: 52,
    height: 52,

    borderRadius: 16,

    alignItems: "center",
    justifyContent: "center",
  },

  examIcon: {
    width: 45,
    height: 45,

    borderRadius: 14,

    alignItems: "center",
    justifyContent: "center",
  },

  examContent: {
    flex: 1,

    marginLeft: 13,

    minWidth: 0,
  },

  examName: {
    fontSize: 16,

    fontWeight: "800",

    color: "#17202E",

    marginBottom: 6,
  },

  examMeta: {
    flexDirection: "row",

    alignItems: "center",

    gap: 12,
  },

  examArrow: {
    width: 34,
    height: 34,

    borderRadius: 17,

    backgroundColor: "#F4F5F8",

    alignItems: "center",
    justifyContent: "center",

    marginLeft: 8,
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  empty: {
    alignItems: "center",

    paddingVertical: 70,

    paddingHorizontal: 30,
  },

  emptyIcon: {
    width: 66,
    height: 66,

    borderRadius: 33,

    backgroundColor: "#EEF1F5",

    alignItems: "center",
    justifyContent: "center",

    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 17,

    fontWeight: "800",

    color: "#17202E",

    marginBottom: 4,
  },

  emptyText: {
    fontSize: 13,

    lineHeight: 19,

    color: "#7A8697",

    textAlign: "center",
  },
});