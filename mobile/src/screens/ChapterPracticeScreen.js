import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

// Each level gets a distinct colour so the ladder is obvious at a glance.
const LEVEL_META = {
  easy: { label: "Easy", tint: colors.success, bg: colors.successLight },
  medium: { label: "Medium", tint: "#0284C7", bg: "#E0F2FE" },
  hard: { label: "Hard", tint: "#EA580C", bg: "#FFF7ED" },
  advanced: { label: "Advanced", tint: "#7C3AED", bg: "#F3E8FF" },
};

export default function ChapterPracticeScreen({ route, navigation }) {
  const { subject, chapter } = route.params;
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/tests/practice-series/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}`
      );
      setTests(res.data.tests);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }, [subject, chapter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function startTest(test) {
    if (!test.isFree) {
      setStarting(test._id);
      try {
        const res = await api.get(`/tests/${test._id}`);
        navigation.navigate("TestTaking", { testId: res.data.test._id });
      } catch (err) {
        Alert.alert("Premium Test", "Ye practice test premium hai. Har chapter ke pehle 2 test free hain.", [
          { text: "Baad mein", style: "cancel" },
          { text: "Upgrade Karo", onPress: () => navigation.navigate("Subscription") },
        ]);
      } finally {
        setStarting(null);
      }
      return;
    }

    setStarting(test._id);
    try {
      const res = await api.get(`/tests/${test._id}`);
      navigation.navigate("TestTaking", { testId: res.data.test._id });
    } catch (err) {
      Alert.alert("Error", "Test load nahi hua");
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
          <Text style={styles.chapterName}>{chapter}</Text>
          <Text style={styles.subjectName}>{subject}</Text>
          <View style={styles.ladderHint}>
            <Ionicons name="trending-up" size={14} color={colors.brand} />
            <Text style={styles.ladderText}>Easy se shuru karo, phir upar badho</Text>
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="book-outline" size={40} color={colors.slate} />
          <Text style={styles.emptyTitle}>Abhi koi practice test nahi</Text>
          <Text style={styles.emptyText}>Is chapter ke tests jald aayenge</Text>
        </View>
      }
      renderItem={({ item }) => {
        const meta = LEVEL_META[item.difficultyLevel] || LEVEL_META.easy;
        const locked = !item.isFree;
        const isStarting = starting === item._id;

        return (
          <TouchableOpacity
            style={styles.testCard}
            activeOpacity={0.7}
            onPress={() => startTest(item)}
            disabled={isStarting}
          >
            <View style={[styles.levelBar, { backgroundColor: meta.tint }]} />

            <View style={{ flex: 1, paddingLeft: spacing.md }}>
              <View style={styles.topRow}>
                <View style={[styles.levelTag, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.levelTagText, { color: meta.tint }]}>{meta.label}</Text>
                </View>
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

              <Text style={styles.testTitle} numberOfLines={1}>
                {item.title}
              </Text>

              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={12} color={colors.slate} />
                <Text style={styles.metaText}>{item.durationMinutes} min</Text>
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
  chapterName: { fontSize: 21, fontWeight: "800", color: colors.ink },
  subjectName: { fontSize: 13, color: colors.slate, marginTop: 2 },
  ladderHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    marginTop: spacing.md,
    alignSelf: "flex-start",
  },
  ladderText: { fontSize: 12, color: colors.brand, fontWeight: "600" },

  testCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    paddingLeft: 0,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  levelBar: { width: 4, alignSelf: "stretch" },

  topRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 5 },
  levelTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  levelTagText: { fontSize: 10, fontWeight: "800" },

  tag: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  tagFree: { backgroundColor: colors.successLight },
  tagPremium: { backgroundColor: "#FFFBEB" },
  tagText: { fontSize: 10, fontWeight: "700" },

  testTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 },
  metaText: { fontSize: 11, color: colors.slate },

  empty: { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate },
});