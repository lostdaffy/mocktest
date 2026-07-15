import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import AppAlert from "../components/AppAlert";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

// One screen, two modes — PYQ and Live share the same shape.
const MODES = {
  pyq: {
    title: "Previous Year Papers",
    subtitle: "Real questions from past exams — the best predictor of what's coming",
    endpoint: "/tests/pyq",
    icon: "library",
    grad: gradients.brand,
    emptyTitle: "No papers yet",
    emptyText: "Previous-year papers are being added — check back soon",
  },
  live: {
    title: "Live Exams",
    subtitle: "Compete with aspirants across India and see where you rank",
    endpoint: "/exams/live/upcoming",
    icon: "radio",
    grad: gradients.danger,
    emptyTitle: "No live exams scheduled",
    emptyText: "New live exams are announced regularly — stay tuned",
  },
};

export default function TestListScreen({ route, navigation }) {
  const mode = route.params?.mode || "pyq";
  const config = MODES[mode];

  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(config.endpoint);
      setTests(res.data.tests || res.data.exams || []);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }, [config.endpoint]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function startTest(test) {
    setStarting(test._id);
    try {
      const res = await api.get(`/tests/${test._id}`);
      navigation.navigate("TestTaking", { testId: res.data.test._id });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        AppAlert.alert("Premium test", err.response.data.message, [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else {
        AppAlert.alert("Something went wrong", "Couldn't load the test");
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      ListHeaderComponent={
        <LinearGradient colors={config.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.ring} />
          <View style={styles.headerIcon}>
            <Ionicons name={config.icon} size={20} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>{config.title}</Text>
          <Text style={styles.headerSub}>{config.subtitle}</Text>
        </LinearGradient>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>{config.emptyTitle}</Text>
          <Text style={styles.emptyText}>{config.emptyText}</Text>
        </View>
      }
      renderItem={({ item }) => {
        const locked = !item.isFree;
        const isStarting = starting === item._id;
        const scheduled = item.scheduledAt ? new Date(item.scheduledAt) : null;

        return (
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.75}
            onPress={() => startTest(item)}
            disabled={isStarting}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.testTitle} numberOfLines={2}>
                {item.title}
              </Text>

              <View style={styles.metaRow}>
                {scheduled ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.slateSoft} />
                    <Text style={styles.metaText}>
                      {scheduled.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                ) : null}

                {item.durationMinutes ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.slateSoft} />
                    <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                  </View>
                ) : null}

                <View style={[styles.tag, locked ? styles.tagPremium : styles.tagFree]}>
                  <Ionicons
                    name={locked ? "lock-closed" : "checkmark-circle"}
                    size={9}
                    color={locked ? colors.warn : colors.success}
                  />
                  <Text style={[styles.tagText, { color: locked ? colors.warn : colors.success }]}>
                    {locked ? "Premium" : "Free"}
                  </Text>
                </View>
              </View>
            </View>

            {isStarting ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <View style={styles.playWrap}>
                <Ionicons name="play" size={13} color={colors.brand} />
              </View>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  header: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    overflow: "hidden",
    ...shadow.md,
  },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 22,
    borderColor: "rgba(255,255,255,0.07)",
    top: -60,
    right: -40,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", marginTop: 4, lineHeight: 19, maxWidth: "92%" },

  testCard: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md, marginBottom: 10 },
  testTitle: { ...type.bodyStrong, color: colors.ink, lineHeight: 20 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 7, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },

  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  tagFree: { backgroundColor: colors.successLight },
  tagPremium: { backgroundColor: colors.warnLight },
  tagText: { fontSize: 10, fontWeight: "700" },

  playWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { alignItems: "center", paddingVertical: 60, gap: 10 },
  emptyIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { ...type.h3, color: colors.ink },
  emptyText: { ...type.small, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.xl },
});