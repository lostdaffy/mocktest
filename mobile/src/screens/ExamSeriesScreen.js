import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import AppAlert from "../components/AppAlert";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function ExamSeriesScreen({ route, navigation }) {
  const { examStage, examName } = route.params;
  const { user } = useAuth();
  const subscribed = isSubscribed(user);
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/tests/exam-series/${examStage}`);
      setTests(res.data.tests);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }, [examStage]);

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

  const freeCount = tests.filter((t) => t.isFree).length;

  return (
    <FlatList
      style={styles.container}
      data={tests}
      keyExtractor={(item) => item._id}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{examName}</Text>
          <Text style={styles.subtitle}>
            {tests.length > 0
              ? `${tests.length} mock test${tests.length > 1 ? "s" : ""} · ${freeCount} free`
              : "Mock test series"}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>No mock tests yet</Text>
          <Text style={styles.emptyText}>New papers are added regularly — check back soon</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const isPremiumItem = !item.isFree;
        const locked = isPremiumItem && !subscribed; // can this student actually NOT play it right now
        const isStarting = starting === item._id;

        return (
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.75}
            onPress={() => startTest(item)}
            disabled={isStarting}
          >
            {locked ? (
              <View style={styles.numBoxLocked}>
                <Text style={styles.numTextLocked}>{item.seriesNumber || index + 1}</Text>
              </View>
            ) : (
              <LinearGradient colors={gradients.brand} style={styles.numBox}>
                <Text style={styles.numText}>{item.seriesNumber || index + 1}</Text>
              </LinearGradient>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.testTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={12} color={colors.slateSoft} />
                  <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                </View>
                {item.questions?.length ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="help-circle-outline" size={12} color={colors.slateSoft} />
                    <Text style={styles.metaText}>{item.questions.length} Q</Text>
                  </View>
                ) : null}
                {isPremiumItem ? (
                  <View style={[styles.tag, locked ? styles.tagPremium : styles.tagUnlocked]}>
                    <Ionicons name={locked ? "lock-closed" : "lock-open"} size={9} color={locked ? colors.warn : colors.success} />
                    <Text style={[styles.tagText, { color: locked ? colors.warn : colors.success }]}>Premium</Text>
                  </View>
                ) : (
                  <View style={[styles.tag, styles.tagFree]}>
                    <Ionicons name="checkmark-circle" size={9} color={colors.success} />
                    <Text style={[styles.tagText, { color: colors.success }]}>Free</Text>
                  </View>
                )}
                {item.attemptStatus === "completed" ? (
                  <View style={[styles.tag, styles.tagDone]}>
                    <Ionicons name="checkmark-done" size={9} color={colors.brand} />
                    <Text style={[styles.tagText, { color: colors.brand }]}>{item.bestAccuracy}%</Text>
                  </View>
                ) : item.attemptStatus === "in_progress" ? (
                  <View style={[styles.tag, styles.tagResume]}>
                    <Ionicons name="time" size={9} color={colors.warn} />
                    <Text style={[styles.tagText, { color: colors.warn }]}>Resume</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {isStarting ? (
              <ActivityIndicator size="small" color={colors.brand} />
            ) : (
              <View style={styles.playWrap}>
                <Ionicons
                  name={item.attemptStatus === "completed" ? "refresh" : item.attemptStatus === "in_progress" ? "play-skip-forward" : "play"}
                  size={13}
                  color={colors.brand}
                />
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

  header: { marginTop: 6, marginBottom: spacing.lg },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.small, color: colors.slate, marginTop: 5 },

  testCard: { ...card, flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.md, marginBottom: 10 },
  numBox: { width: 44, height: 44, borderRadius: radius.md, alignItems: "center", justifyContent: "center", ...shadow.sm },
  numBoxLocked: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  numText: { fontSize: 16, fontWeight: "800", color: "#fff" },
  numTextLocked: { fontSize: 16, fontWeight: "800", color: colors.slateSoft },

  testTitle: { ...type.bodyStrong, color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },

  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  tagFree: { backgroundColor: colors.successLight },
  tagPremium: { backgroundColor: colors.warnLight },
  tagUnlocked: { backgroundColor: colors.successLight },
  tagDone: { backgroundColor: colors.brandLight },
  tagResume: { backgroundColor: colors.warnLight },
  tagText: { fontSize: 10, fontWeight: "700" },

  playWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

  empty: { alignItems: "center", paddingVertical: 70, gap: 10 },
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