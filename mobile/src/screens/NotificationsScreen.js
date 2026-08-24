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

import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

   The in-app counterpart to the push reminders the server
   sends 15 minutes before a live exam starts (see
   server/jobs/liveExamScheduler.js). Live exams are the only
   thing this app notifies about, so this reads from the same
   /exams/live/upcoming feed rather than a separate
   notifications collection.
========================================================= */

function relativeWhen(scheduledAt, state) {
  if (state === "ongoing") return "Happening now";
  if (state === "ended") return "Finished";

  const diffMs =
    new Date(scheduledAt) - new Date();

  if (diffMs <= 0) return "Starting now";

  const minutes = Math.round(
    diffMs / 60000
  );

  if (minutes < 60)
    return `Starts in ${minutes} min`;

  const hours = Math.round(minutes / 60);
  if (hours < 24)
    return `Starts in ${hours} hr`;

  const days = Math.round(hours / 24);
  return `Starts in ${days} day${
    days === 1 ? "" : "s"
  }`;
}

export default function NotificationsScreen({
  navigation,
}) {
  const insets = useSafeAreaInsets();

  const [exams, setExams] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get(
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View
        style={[
          styles.header,
          {
            paddingTop:
              Math.max(insets.top, 12) + 6,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.75}
          hitSlop={8}
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={colors.ink}
          />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            Notifications
          </Text>

          <Text style={styles.headerSub}>
            Live exam alerts and reminders
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator
            size="small"
            color={colors.brand}
          />
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
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                spacing.xxl + insets.bottom,
            },
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View
                style={styles.emptyIcon}
              >
                <Ionicons
                  name="notifications-off-outline"
                  size={28}
                  color={colors.brand}
                />
              </View>

              <Text
                style={styles.emptyTitle}
              >
                No notifications yet
              </Text>

              <Text
                style={styles.emptyText}
              >
                When a live exam is scheduled, you'll get an alert here and on
                your phone 15 minutes before it starts.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const state =
              item.liveState || "upcoming";

            const isLive =
              state === "ongoing";

            const tint = isLive
              ? colors.danger
              : state === "ended"
              ? colors.slateSoft
              : colors.brand;

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.82}
                onPress={() =>
                  navigation.navigate(
                    "Home",
                    { screen: "LiveTab" }
                  )
                }
              >
                <View
                  style={[
                    styles.cardIcon,
                    {
                      backgroundColor: `${tint}14`,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      isLive
                        ? "radio"
                        : "calendar-outline"
                    }
                    size={18}
                    color={tint}
                  />
                </View>

                <View
                  style={styles.cardBody}
                >
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>

                  <Text
                    style={[
                      styles.cardWhen,
                      { color: tint },
                    ]}
                  >
                    {relativeWhen(
                      item.scheduledAt,
                      state
                    )}
                  </Text>

                  <Text
                    style={styles.cardMeta}
                  >
                    {new Date(
                      item.scheduledAt
                    ).toLocaleString("en-IN", {
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                    {item.durationMinutes
                      ? ` · ${item.durationMinutes} min`
                      : ""}
                  </Text>
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.slateSoft}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  backButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    ...type.h2,
    fontSize: 20,
    lineHeight: 25,
    color: colors.ink,
    fontWeight: "800",
  },

  headerSub: {
    fontSize: 11,
    color: colors.slate,
    marginTop: 2,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 16,
  },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    ...shadow.sm,
  },

  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  cardBody: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: "800",
    color: colors.ink,
  },

  cardWhen: {
    fontSize: 11,
    fontWeight: "800",
    marginTop: 3,
  },

  cardMeta: {
    fontSize: 10,
    color: colors.slateSoft,
    marginTop: 2,
  },

  empty: {
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: 28,
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },

  emptyTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "800",
    color: colors.ink,
    marginBottom: 5,
  },

  emptyText: {
    fontSize: 11.5,
    lineHeight: 18,
    color: colors.slate,
    textAlign: "center",
    maxWidth: 290,
  },
});
