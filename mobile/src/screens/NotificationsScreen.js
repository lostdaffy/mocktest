import {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";

import {
  useFocusEffect,
} from "@react-navigation/native";

import {
  Ionicons,
} from "@expo/vector-icons";

import {
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import api from "../api/client";

import {
  colors,
  spacing,
  radius,
  type,
  shadow,
} from "../theme/theme";

/* =========================================================
   NOTIFICATIONS SCREEN
   Rankveer Premium Design
========================================================= */

/* =========================================================
   RELATIVE TIME
========================================================= */

function relativeWhen(
  scheduledAt,
  state
) {
  if (state === "ongoing") {
    return "Happening now";
  }

  if (state === "ended") {
    return "Finished";
  }

  const diffMs =
    new Date(scheduledAt) -
    new Date();

  if (diffMs <= 0) {
    return "Starting now";
  }

  const minutes = Math.round(
    diffMs / 60000
  );

  if (minutes < 60) {
    return `Starts in ${minutes} min`;
  }

  const hours = Math.round(
    minutes / 60
  );

  if (hours < 24) {
    return `Starts in ${hours} hr`;
  }

  const days = Math.round(
    hours / 24
  );

  return `Starts in ${days} day${
    days === 1 ? "" : "s"
  }`;
}

/* =========================================================
   DATE
========================================================= */

function formatDate(
  scheduledAt
) {
  return new Date(
    scheduledAt
  ).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* =========================================================
   NOTIFICATIONS SCREEN
========================================================= */

export default function NotificationsScreen({
  navigation,
}) {
  const insets =
    useSafeAreaInsets();

  const [exams, setExams] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     LOAD NOTIFICATIONS
  ======================================================= */

  const load = useCallback(
    async () => {
      try {
        const res =
          await api.get(
            "/exams/live/upcoming"
          );

        setExams(
          res.data?.exams ||
            res.data?.tests ||
            []
        );
      } catch (err) {
        console.log(
          "Notifications loading error:",
          err
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /* =======================================================
     REFRESH WHEN SCREEN FOCUSES
  ======================================================= */

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <View
      style={styles.container}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              insets.top + 10,
          },
        ]}
      >
        {/* BACK */}

        <TouchableOpacity
          style={
            styles.backButton
          }
          activeOpacity={0.75}
          hitSlop={8}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="chevron-back"
            size={21}
            color={colors.ink}
          />
        </TouchableOpacity>

        {/* TITLE */}

        <View
          style={
            styles.headerText
          }
        >
          <View
            style={
              styles.headerTitleRow
            }
          >
            <Text
              style={
                styles.headerTitle
              }
            >
              Notifications
            </Text>

            {!loading &&
              exams.length > 0 && (
                <View
                  style={
                    styles.countBadge
                  }
                >
                  <Text
                    style={
                      styles.countText
                    }
                  >
                    {exams.length}
                  </Text>
                </View>
              )}
          </View>

          <Text
            style={
              styles.headerSub
            }
          >
            Live exam alerts and reminders
          </Text>
        </View>

        {/* NOTIFICATION ICON */}

        <View
          style={
            styles.headerIcon
          }
        >
          <Ionicons
            name="notifications-outline"
            size={19}
            color={colors.brand}
          />
        </View>
      </View>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <View
          style={
            styles.loadingContainer
          }
        >
          <View
            style={
              styles.loadingCard
            }
          >
            <View
              style={
                styles.loadingIcon
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
              Loading notifications
            </Text>

            <Text
              style={
                styles.loadingSub
              }
            >
              Checking upcoming live exams
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) =>
            String(item._id)
          }
          showsVerticalScrollIndicator={
            false
          }
          bounces={false}
          overScrollMode="never"
          contentInsetAdjustmentBehavior="never"
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                spacing.xxl +
                insets.bottom +
                12,
            },
          ]}
          ListHeaderComponent={
            exams.length > 0 ? (
              <View
                style={
                  styles.infoCard
                }
              >
                <View
                  style={
                    styles.infoIcon
                  }
                >
                  <Ionicons
                    name="radio-outline"
                    size={19}
                    color={
                      colors.brand
                    }
                  />
                </View>

                <View
                  style={
                    styles.infoContent
                  }
                >
                  <Text
                    style={
                      styles.infoTitle
                    }
                  >
                    Live exam updates
                  </Text>

                  <Text
                    style={
                      styles.infoText
                    }
                  >
                    Upcoming live exams and their latest start times will appear here.
                  </Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState />
          }
          renderItem={({
            item,
          }) => {
            const state =
              item.liveState ||
              "upcoming";

            const isLive =
              state === "ongoing";

            const isEnded =
              state === "ended";

            const tint = isLive
              ? colors.danger
              : isEnded
              ? colors.slateSoft
              : colors.brand;

            const icon =
              isLive
                ? "radio"
                : isEnded
                ? "checkmark-circle-outline"
                : "calendar-outline";

            return (
              <NotificationCard
                item={item}
                state={state}
                isLive={isLive}
                isEnded={isEnded}
                tint={tint}
                icon={icon}
                navigation={
                  navigation
                }
              />
            );
          }}
        />
      )}
    </View>
  );
}

/* =========================================================
   NOTIFICATION CARD
========================================================= */

function NotificationCard({
  item,
  state,
  isLive,
  isEnded,
  tint,
  icon,
  navigation,
}) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        isLive &&
          styles.liveCard,
        isEnded &&
          styles.endedCard,
      ]}
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate(
          "Home",
          {
            screen: "LiveTab",
          }
        )
      }
    >
      {/* LEFT BRAND ACCENT */}

      <View
        style={[
          styles.cardAccent,
          {
            backgroundColor:
              tint,
          },
        ]}
      />

      {/* ICON */}

      <View
        style={[
          styles.cardIcon,
          {
            backgroundColor:
              isLive
                ? colors.dangerLight
                : isEnded
                ? colors.slateLight
                : colors.brandLight,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={19}
          color={tint}
        />
      </View>

      {/* CONTENT */}

      <View
        style={
          styles.cardBody
        }
      >
        {/* LABEL */}

        <View
          style={
            styles.cardTopRow
          }
        >
          <Text
            style={
              styles.cardLabel
            }
          >
            {isLive
              ? "LIVE EXAM"
              : isEnded
              ? "COMPLETED"
              : "UPCOMING EXAM"}
          </Text>

          {isLive && (
            <View
              style={
                styles.liveBadge
              }
            >
              <View
                style={
                  styles.liveDot
                }
              />

              <Text
                style={
                  styles.liveBadgeText
                }
              >
                LIVE
              </Text>
            </View>
          )}
        </View>

        {/* TITLE */}

        <Text
          style={[
            styles.cardTitle,
            isEnded &&
              styles.endedTitle,
          ]}
          numberOfLines={2}
        >
          {item.title}
        </Text>

        {/* RELATIVE TIME */}

        <View
          style={
            styles.whenRow
          }
        >
          <Ionicons
            name="time-outline"
            size={14}
            color={tint}
          />

          <Text
            style={[
              styles.cardWhen,
              {
                color: tint,
              },
            ]}
          >
            {relativeWhen(
              item.scheduledAt,
              state
            )}
          </Text>
        </View>

        {/* META */}

        <View
          style={
            styles.metaRow
          }
        >
          <Ionicons
            name="calendar-outline"
            size={12}
            color={
              colors.slateSoft
            }
          />

          <Text
            style={
              styles.cardMeta
            }
          >
            {formatDate(
              item.scheduledAt
            )}
          </Text>

          {item.durationMinutes ? (
            <>
              <View
                style={
                  styles.metaDot
                }
              />

              <Ionicons
                name="hourglass-outline"
                size={11}
                color={
                  colors.slateSoft
                }
              />

              <Text
                style={
                  styles.cardMeta
                }
              >
                {
                  item.durationMinutes
                }{" "}
                min
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {/* ARROW */}

      <View
        style={
          styles.arrowButton
        }
      >
        <Ionicons
          name="chevron-forward"
          size={16}
          color={
            colors.slateSoft
          }
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
      style={
        styles.empty
      }
    >
      <View
        style={
          styles.emptyIconOuter
        }
      >
        <View
          style={
            styles.emptyIcon
          }
        >
          <Ionicons
            name="notifications-off-outline"
            size={28}
            color={colors.brand}
          />
        </View>
      </View>

      <Text
        style={
          styles.emptyTitle
        }
      >
        No notifications yet
      </Text>

      <Text
        style={
          styles.emptyText
        }
      >
        When a live exam is scheduled,
        you'll get an alert here and on
        your phone 15 minutes before it
        starts.
      </Text>

      <View
        style={
          styles.emptyHint
        }
      >
        <Ionicons
          name="shield-checkmark-outline"
          size={14}
          color={colors.brand}
        />

        <Text
          style={
            styles.emptyHintText
          }
        >
          We'll keep you updated.
        </Text>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles =
  StyleSheet.create({
    /* =====================================================
       BASE
    ===================================================== */

    container: {
      flex: 1,
      backgroundColor:
        colors.bg,
    },

    /* =====================================================
       HEADER
    ===================================================== */

    header: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal:
        spacing.lg,
      paddingBottom: 15,
      backgroundColor:
        colors.surface,
      borderBottomWidth: 1,
      borderBottomColor:
        colors.border,
    },

    backButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 12,
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    headerTitleRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },

    headerTitle: {
      ...type.h2,
      fontSize: 21,
      lineHeight: 26,
      color: colors.ink,
      fontWeight: "900",
      letterSpacing: -0.35,
    },

    countBadge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 6,
      borderRadius: 11,
      marginLeft: 8,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    countText: {
      fontSize: 9,
      lineHeight: 12,
      fontWeight: "900",
      color: colors.brand,
    },

    headerSub: {
      fontSize: 11,
      lineHeight: 16,
      color: colors.slate,
      marginTop: 2,
      fontWeight: "500",
    },

    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 10,
    },

    /* =====================================================
       LOADING
    ===================================================== */

    loadingContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal:
        spacing.lg,
    },

    loadingCard: {
      width: "100%",
      maxWidth: 300,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        colors.surface,
      borderRadius:
        radius.xl,
      borderWidth: 1,
      borderColor:
        colors.border,
      paddingVertical: 28,
      paddingHorizontal: 20,
      ...shadow.sm,
    },

    loadingIcon: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor:
        colors.brandLight,
      alignItems:
        "center",
      justifyContent:
        "center",
    },

    loadingTitle: {
      marginTop: 12,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
    },

    loadingSub: {
      marginTop: 3,
      fontSize: 10.5,
      lineHeight: 15,
      color: colors.slate,
      textAlign: "center",
    },

    /* =====================================================
       LIST
    ===================================================== */

    listContent: {
      flexGrow: 1,
      paddingHorizontal:
        spacing.lg,
      paddingTop: 16,
    },

    /* =====================================================
       INFO CARD
    ===================================================== */

    infoCard: {
      flexDirection:
        "row",
      alignItems:
        "center",
      padding: 13,
      marginBottom: 12,
      borderRadius: 18,
      backgroundColor:
        colors.brandTint,
      borderWidth: 1,
      borderColor:
        colors.borderSoft,
    },

    infoIcon: {
      width: 43,
      height: 43,
      borderRadius: 14,
      backgroundColor:
        colors.surface,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginRight: 11,
      ...shadow.sm,
    },

    infoContent: {
      flex: 1,
      minWidth: 0,
    },

    infoTitle: {
      fontSize: 12.5,
      lineHeight: 17,
      fontWeight: "800",
      color: colors.ink,
    },

    infoText: {
      fontSize: 10.5,
      lineHeight: 15,
      color: colors.slate,
      marginTop: 2,
    },

    /* =====================================================
       NOTIFICATION CARD
    ===================================================== */

    card: {
      position: "relative",
      flexDirection:
        "row",
      alignItems:
        "center",
      backgroundColor:
        colors.surface,
      borderRadius:
        radius.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      padding: 13,
      paddingLeft: 14,
      marginBottom: 10,
      gap: 11,
      overflow: "hidden",
      ...shadow.sm,
    },

    liveCard: {
      borderColor:
        colors.dangerBorder,
      backgroundColor:
        colors.surface,
    },

    endedCard: {
      opacity: 0.72,
    },

    cardAccent: {
      position: "absolute",
      left: 0,
      top: 12,
      bottom: 12,
      width: 3,
      borderRadius: 3,
    },

    cardIcon: {
      width: 45,
      height: 45,
      borderRadius: 14,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginLeft: 2,
    },

    cardBody: {
      flex: 1,
      minWidth: 0,
    },

    cardTopRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      minWidth: 0,
      marginBottom: 3,
    },

    cardLabel: {
      fontSize: 8.5,
      lineHeight: 12,
      fontWeight: "900",
      letterSpacing: 0.65,
      color: colors.slateSoft,
    },

    liveBadge: {
      flexDirection:
        "row",
      alignItems:
        "center",
      paddingHorizontal: 7,
      height: 20,
      borderRadius: 10,
      backgroundColor:
        colors.dangerLight,
      marginLeft: 6,
    },

    liveDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor:
        colors.danger,
      marginRight: 4,
    },

    liveBadgeText: {
      fontSize: 8,
      lineHeight: 10,
      fontWeight: "900",
      color: colors.danger,
      letterSpacing: 0.4,
    },

    cardTitle: {
      fontSize: 13.5,
      lineHeight: 18,
      fontWeight: "800",
      color: colors.ink,
    },

    endedTitle: {
      color: colors.slate,
    },

    whenRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 5,
    },

    cardWhen: {
      fontSize: 11,
      lineHeight: 15,
      fontWeight: "900",
      marginLeft: 5,
    },

    metaRow: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 3,
      minWidth: 0,
    },

    cardMeta: {
      fontSize: 9.5,
      lineHeight: 14,
      color: colors.slateSoft,
      marginLeft: 4,
      fontWeight: "500",
    },

    metaDot: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor:
        colors.slateSoft,
      marginHorizontal: 6,
    },

    arrowButton: {
      width: 31,
      height: 31,
      borderRadius: 10,
      backgroundColor:
        colors.slateLight,
      alignItems:
        "center",
      justifyContent:
        "center",
      flexShrink: 0,
    },

    /* =====================================================
       EMPTY
    ===================================================== */

    empty: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
      paddingBottom: 70,
    },

    emptyIconOuter: {
      width: 88,
      height: 88,
      borderRadius: 28,
      backgroundColor:
        colors.brandTint,
      alignItems:
        "center",
      justifyContent:
        "center",
      marginBottom: 16,
    },

    emptyIcon: {
      width: 66,
      height: 66,
      borderRadius: 22,
      backgroundColor:
        colors.surface,
      alignItems:
        "center",
      justifyContent:
        "center",
      ...shadow.sm,
    },

    emptyTitle: {
      fontSize: 18,
      lineHeight: 23,
      fontWeight: "900",
      color: colors.ink,
      marginBottom: 6,
      letterSpacing: -0.2,
    },

    emptyText: {
      fontSize: 11.5,
      lineHeight: 18,
      color: colors.slate,
      textAlign: "center",
      maxWidth: 300,
    },

    emptyHint: {
      flexDirection:
        "row",
      alignItems:
        "center",
      marginTop: 18,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 12,
      backgroundColor:
        colors.slateLight,
    },

    emptyHintText: {
      fontSize: 9.5,
      lineHeight: 14,
      color: colors.slate,
      fontWeight: "600",
      marginLeft: 5,
    },
  });