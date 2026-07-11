import { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

const MODE_CONFIG = {
  mock: {
    label: "Mock Tests",
    sub: "Poore-length practice tests",
    type: "full_mock",
    icon: "document-text",
    emptyTitle: "Abhi koi mock test nahi",
    emptyText: "Naye mocks jald aayenge",
  },
  pyq: {
    label: "PYQ Papers",
    sub: "Pichhle saalon ke asli question papers",
    type: "pyq",
    icon: "library",
    emptyTitle: "Abhi koi PYQ paper nahi",
    emptyText: "Previous year papers jald add honge",
  },
  live: {
    label: "Live Exams",
    sub: "Sabke saath ek hi time pe do — rank dekho",
    type: "live",
    icon: "radio",
    emptyTitle: "Abhi koi live exam nahi",
    emptyText: "Agla live exam jald schedule hoga",
  },
};

export default function TestListScreen({ route, navigation }) {
  const mode = route?.params?.mode || "mock";
  const cfg = MODE_CONFIG[mode] || MODE_CONFIG.mock;

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tests", { params: { type: cfg.type } });
      setTests(res.data.tests || []);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }, [cfg.type]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    // When used as a stack screen (not a tab), show the right header title
    if (navigation.setOptions) navigation.setOptions({ title: cfg.label });
  }, [navigation, cfg.label]);

  async function startTest(test) {
    setStarting(test._id);
    try {
      const res = await api.get(`/tests/${test._id}`);
      navigation.navigate("TestTaking", { testId: res.data.test._id });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        Alert.alert("Premium Test", err.response.data.message, [
          { text: "Baad mein", style: "cancel" },
          { text: "Upgrade Karo", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else {
        Alert.alert("Error", "Test load nahi hua");
      }
    } finally {
      setStarting(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={tests}
      keyExtractor={(item) => item._id}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{cfg.label}</Text>
          <Text style={styles.subtitle}>{cfg.sub}</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name={`${cfg.icon}-outline`} size={40} color={colors.slate} />
          <Text style={styles.emptyTitle}>{cfg.emptyTitle}</Text>
          <Text style={styles.emptyText}>{cfg.emptyText}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const locked = !item.isFree;
        const isStarting = starting === item._id;

        return (
          <TouchableOpacity
            style={[styles.testCard, mode === "live" && styles.testCardLive]}
            activeOpacity={0.7}
            onPress={() => startTest(item)}
            disabled={isStarting}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={cfg.icon} size={19} color={colors.brand} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.testTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.slate} />
                  <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                </View>
                {item.questions?.length ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="help-circle-outline" size={12} color={colors.slate} />
                    <Text style={styles.metaText}>{item.questions.length} Q</Text>
                  </View>
                ) : null}
                <View style={[styles.tag, locked ? styles.tagPremium : styles.tagFree]}>
                  <Ionicons
                    name={locked ? "lock-closed" : "checkmark-circle"}
                    size={10}
                    color={locked ? "#B45309" : colors.success}
                  />
                  <Text style={[styles.tagText, { color: locked ? "#B45309" : colors.success }]}>
                    {locked ? "Premium" : "Free"}
                  </Text>
                </View>
              </View>
            </View>

            {isStarting ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <Ionicons name="play-circle" size={28} color={colors.brand} />
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateLight },

  header: { marginTop: 8, marginBottom: spacing.lg },
  title: { fontSize: 21, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 4 },

  testCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testCardLive: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  testTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 5, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: colors.slate },

  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  tagFree: { backgroundColor: colors.successLight },
  tagPremium: { backgroundColor: "#FFFBEB" },
  tagText: { fontSize: 10, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: 70, gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.lg },
});