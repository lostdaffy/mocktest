import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

export default function ExamSeriesScreen({ route, navigation }) {
  const { examStage, examName } = route.params;
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
          <Text style={styles.title}>{examName}</Text>
          <Text style={styles.subtitle}>
            {tests.length > 0
              ? `${tests.length} mock test${tests.length > 1 ? "s" : ""} — asli exam jaisa pattern`
              : "Mock series"}
          </Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={40} color={colors.slate} />
          <Text style={styles.emptyTitle}>Abhi koi mock test nahi</Text>
          <Text style={styles.emptyText}>Naye mocks jald aayenge — thodi der baad check karo</Text>
        </View>
      }
      renderItem={({ item, index }) => {
        const locked = !item.isFree;
        const isStarting = starting === item._id;

        return (
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.7}
            onPress={() => startTest(item)}
            disabled={isStarting}
          >
            <View style={[styles.numBox, locked && styles.numBoxLocked]}>
              <Text style={[styles.numText, locked && styles.numTextLocked]}>{item.seriesNumber || index + 1}</Text>
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
  numBox: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  numBoxLocked: { backgroundColor: colors.slateLight },
  numText: { fontSize: 16, fontWeight: "800", color: colors.brand },
  numTextLocked: { color: colors.slate },

  testTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 5, flexWrap: "wrap" },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: colors.slate },

  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full },
  tagFree: { backgroundColor: colors.successLight },
  tagPremium: { backgroundColor: "#FFFBEB" },
  tagText: { fontSize: 10, fontWeight: "700" },

  empty: { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.lg },
});