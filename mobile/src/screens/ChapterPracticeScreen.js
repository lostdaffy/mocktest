import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius, type, card } from "../theme/theme";

// Order matters - this is the ladder, and it drives the lock logic below.
const LEVELS = [
  { key: "easy", label: "Easy", tint: colors.easy, bg: colors.easyBg },
  { key: "medium", label: "Medium", tint: colors.medium, bg: colors.mediumBg },
  { key: "hard", label: "Hard", tint: colors.hard, bg: colors.hardBg },
  { key: "advanced", label: "Advanced", tint: colors.advanced, bg: colors.advancedBg },
];

export default function ChapterPracticeScreen({ route, navigation }) {
  const { subject, chapter, currentLevel, isCompleted } = route.params;
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);

  const currentLevelIdx = Math.max(
    0,
    LEVELS.findIndex((l) => l.key === currentLevel)
  );

  // Which tab is open - defaults to wherever the student actually is on the ladder,
  // so they land straight on relevant tests instead of always starting at Easy.
  const [activeIdx, setActiveIdx] = useState(currentLevelIdx);

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
    setStarting(test._id);
    try {
      const res = await api.get(`/tests/${test._id}`);
      navigation.navigate("TestTaking", { testId: res.data.test._id });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED" || !test.isFree) {
        Alert.alert("Premium test", "Upgrade to unlock every practice test in this chapter.", [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else {
        Alert.alert("Something went wrong", "Couldn't load the test");
      }
    } finally {
      setStarting(null);
    }
  }

  const countsByLevel = useMemo(() => {
    const map = {};
    LEVELS.forEach((l) => (map[l.key] = 0));
    tests.forEach((t) => {
      if (map[t.difficultyLevel] !== undefined) map[t.difficultyLevel] += 1;
    });
    return map;
  }, [tests]);

  const activeLevel = LEVELS[activeIdx];
  const activeLocked = !isCompleted && activeIdx > currentLevelIdx;
  const activeTests = tests.filter((t) => t.difficultyLevel === activeLevel.key);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.chapterName}>{chapter}</Text>
        <Text style={styles.subjectName}>{subject}</Text>
      </View>

      {/* Horizontal level switcher - keeps the screen to ONE level's tests at a
          time instead of stacking all four vertically, which was the long-scroll problem. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
        style={styles.tabScroll}
      >
        {LEVELS.map((lvl, idx) => {
          const locked = !isCompleted && idx > currentLevelIdx;
          const active = idx === activeIdx;
          const count = countsByLevel[lvl.key];

          return (
            <TouchableOpacity
              key={lvl.key}
              style={[
                styles.tab,
                active && { backgroundColor: lvl.tint, borderColor: lvl.tint },
                !active && locked && styles.tabLocked,
              ]}
              onPress={() => setActiveIdx(idx)}
              activeOpacity={0.75}
            >
              {locked && <Ionicons name="lock-closed" size={11} color={active ? "#fff" : colors.slateSoft} style={{ marginRight: 4 }} />}
              <Text style={[styles.tabText, active && styles.tabTextActive, !active && locked && styles.tabTextLocked]}>
                {lvl.label}
              </Text>
              {count > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {activeLocked && (
        <View style={styles.lockedBanner}>
          <Ionicons name="lock-closed" size={14} color={colors.slateSoft} />
          <Text style={styles.lockedBannerText}>
            Complete a test in {LEVELS[activeIdx - 1]?.label} first to unlock {activeLevel.label}.
          </Text>
        </View>
      )}

      <FlatList
        data={activeTests}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="book-outline" size={26} color={colors.slateSoft} />
            </View>
            <Text style={styles.emptyTitle}>No {activeLevel.label} tests yet</Text>
            <Text style={styles.emptyText}>More tests for this level are coming soon</Text>
          </View>
        }
        renderItem={({ item }) => {
          const premiumLocked = !item.isFree;
          const isStarting = starting === item._id;

          return (
            <TouchableOpacity
              style={[styles.testCard, activeLocked && styles.testCardLocked]}
              activeOpacity={0.75}
              onPress={() => {
                if (activeLocked) {
                  Alert.alert(
                    "Level locked",
                    `Clear a test in ${LEVELS[activeIdx - 1]?.label} to unlock ${activeLevel.label}.`
                  );
                  return;
                }
                startTest(item);
              }}
              disabled={isStarting}
            >
              <View style={[styles.levelBar, { backgroundColor: activeLocked ? colors.border : activeLevel.tint }]} />

              <View style={styles.testBody}>
                <View style={styles.topRow}>
                  {premiumLocked && !activeLocked ? (
                    <View style={styles.tag}>
                      <Ionicons name="lock-closed" size={9} color={colors.warn} />
                      <Text style={[styles.tagText, { color: colors.warn }]}>Premium</Text>
                    </View>
                  ) : !activeLocked ? (
                    <View style={styles.tag}>
                      <Ionicons name="checkmark-circle" size={9} color={colors.success} />
                      <Text style={[styles.tagText, { color: colors.success }]}>Free</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={[styles.testTitle, activeLocked && styles.testTitleLocked]} numberOfLines={1}>
                  {item.title}
                </Text>

                <View style={styles.metaRow}>
                  <Ionicons name="time-outline" size={12} color={colors.slateSoft} />
                  <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                  {item.questions?.length ? (
                    <>
                      <View style={styles.dot} />
                      <Text style={styles.metaText}>{item.questions.length} questions</Text>
                    </>
                  ) : null}
                </View>
              </View>

              {isStarting ? (
                <ActivityIndicator size="small" color={colors.brand} style={{ marginRight: spacing.md }} />
              ) : (
                <View style={[styles.playWrap, activeLocked && styles.playWrapLocked]}>
                  <Ionicons name={activeLocked ? "lock-closed" : "play"} size={13} color={activeLocked ? colors.slateSoft : colors.brand} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  chapterName: { ...type.h1, color: colors.ink },
  subjectName: { ...type.small, color: colors.slate, marginTop: 3 },

  tabScroll: { flexGrow: 0, marginBottom: spacing.sm },
  tabRow: { paddingHorizontal: spacing.lg, gap: 8, paddingVertical: 4 },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  tabLocked: { backgroundColor: colors.slateLight },
  tabText: { ...type.small, fontWeight: "700", color: colors.ink },
  tabTextActive: { color: "#fff" },
  tabTextLocked: { color: colors.slateSoft },
  tabCount: { backgroundColor: colors.slateLight, borderRadius: radius.full, minWidth: 18, height: 18, alignItems: "center", justifyContent: "center", marginLeft: 6, paddingHorizontal: 4 },
  tabCountActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  tabCountText: { fontSize: 10, fontWeight: "800", color: colors.slate },
  tabCountTextActive: { color: "#fff" },

  lockedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.slateLight,
    borderRadius: radius.md,
    padding: 10,
    marginBottom: spacing.xs,
  },
  lockedBannerText: { flex: 1, ...type.tiny, color: colors.slate, fontWeight: "500", lineHeight: 15 },

  testCard: { ...card, flexDirection: "row", alignItems: "center", marginBottom: 10, overflow: "hidden" },
  testCardLocked: { opacity: 0.6 },
  levelBar: { width: 4, alignSelf: "stretch" },
  testBody: { flex: 1, padding: spacing.md },

  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 6, minHeight: 16 },
  tag: { flexDirection: "row", alignItems: "center", gap: 3 },
  tagText: { fontSize: 10, fontWeight: "700" },

  testTitle: { ...type.bodyStrong, color: colors.ink },
  testTitleLocked: { color: colors.slateSoft },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  metaText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border, marginHorizontal: 3 },

  playWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  playWrapLocked: { backgroundColor: colors.slateLight },

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
  emptyText: { ...type.small, color: colors.slate },
});