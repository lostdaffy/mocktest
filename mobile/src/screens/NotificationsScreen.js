import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";
import { colors, spacing } from "../theme/theme";
import { getSeenAt, markSeen } from "../utils/notificationSeen";

// Notifications: what is new for this student - today's quiz or the rank
// they got in it, a streak that ends tonight, live exams coming up, and mock
// tests newly added for their exam (GET /tests/notifications). Each one
// opens the place it is about. Opening the screen clears the dot on Home's
// bell. It used to list upcoming live exams only, so it was nearly always
// empty.

const LOOK = {
  quiz: { icon: "flash", fg: colors.brand, bg: colors.brandLight },
  quiz_rank: { icon: "trophy", fg: "#B45309", bg: "#FEF3C7" },
  streak: { icon: "flame", fg: "#EA580C", bg: "#FFF1E8" },
  live: { icon: "radio", fg: "#E11D48", bg: "#FFF1F2" },
  mock: { icon: "document-text", fg: colors.brand, bg: colors.brandLight },
};

function ago(at) {
  const ms = Date.now() - new Date(at).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState(null);
  const [seenAt, setSeenAt] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const before = await getSeenAt();
    setSeenAt(before);
    try {
      const res = await api.get("/tests/notifications");
      setItems(res.data?.items || []);
      markSeen(res.data?.serverTime || new Date());
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function open(item) {
    const a = item.action || {};
    if (!a.screen) return;
    if (a.screen === "HomeTab" || a.screen === "LiveTab") return navigation.navigate("Home", { screen: a.screen });
    navigation.navigate(a.screen, a.params || {});
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity style={styles.back} activeOpacity={0.75} hitSlop={8} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.sub}>Quiz, streak, live exams and new tests</Text>
        </View>
      </View>

      {items === null ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.brand} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={colors.brand}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="notifications-off-outline" size={26} color={colors.brand} />
              </View>
              <Text style={styles.emptyTitle}>Nothing new right now</Text>
              <Text style={styles.emptyText}>Today's quiz, live exams and new mock tests will show up here.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const look = LOOK[item.kind] || LOOK.mock;
            const isNew = !seenAt || new Date(item.at) > seenAt;
            return (
              <TouchableOpacity style={[styles.card, isNew && styles.cardNew]} activeOpacity={0.85} onPress={() => open(item)}>
                <View style={[styles.icon, { backgroundColor: look.bg }]}>
                  <Ionicons name={look.icon} size={18} color={look.fg} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.titleRow}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {isNew && <View style={styles.newDot} />}
                  </View>
                  {!!item.body && (
                    <Text style={styles.cardBody} numberOfLines={2}>
                      {item.body}
                    </Text>
                  )}
                  <Text style={styles.when}>{ago(item.at)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.slateSoft} />
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  sub: { fontSize: 12, color: colors.slate, marginTop: 1 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 10,
  },
  cardNew: { borderColor: colors.brandLight, backgroundColor: colors.brandTint },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "800", color: colors.ink, lineHeight: 19 },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.danger, marginTop: 5 },
  cardBody: { fontSize: 12.5, color: colors.inkSoft, marginTop: 2, lineHeight: 17 },
  when: { fontSize: 11, color: colors.slateSoft, marginTop: 4, fontWeight: "600" },

  empty: { alignItems: "center", marginTop: 80, paddingHorizontal: spacing.lg },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: 6, lineHeight: 19 },
});
