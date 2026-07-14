import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, SectionList, ActivityIndicator, Alert } from "react-native";
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

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  // Group the flat, difficulty-sorted list from the backend into one
  // section per level - this is what stops Easy/Medium/Hard/Advanced from
  // reading as one mixed list.
  const sections = LEVELS.map((lvl, idx) => ({
    level: lvl,
    idx,
    locked: !isCompleted && idx > currentLevelIdx,
    data: tests.filter((t) => t.difficultyLevel === lvl.key),
  })).filter((s) => s.data.length > 0 || s.idx <= currentLevelIdx || isCompleted);

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item._id}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.chapterName}>{chapter}</Text>
          <Text style={styles.subjectName}>{subject}</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="book-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>No practice tests yet</Text>
          <Text style={styles.emptyText}>Tests for this chapter are coming soon</Text>
        </View>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionDot, { backgroundColor: section.level.tint }]} />
          <Text style={styles.sectionTitle}>{section.level.label}</Text>
          {section.locked ? (
            <View style={styles.lockedTag}>
              <Ionicons name="lock-closed" size={10} color={colors.slateSoft} />
              <Text style={styles.lockedTagText}>Complete {LEVELS[section.idx - 1]?.label} first</Text>
            </View>
          ) : section.data.length === 0 ? (
            <Text style={styles.comingSoonText}>Coming soon</Text>
          ) : null}
        </View>
      )}
      renderItem={({ item, section }) => {
        const premiumLocked = !item.isFree;
        const levelLocked = section.locked;
        const isStarting = starting === item._id;

        return (
          <TouchableOpacity
            style={[styles.testCard, levelLocked && styles.testCardLocked]}
            activeOpacity={0.75}
            onPress={() => {
              if (levelLocked) {
                Alert.alert(
                  "Level locked",
                  `Clear a test in ${LEVELS[section.idx - 1]?.label} to unlock ${section.level.label}.`
                );
                return;
              }
              startTest(item);
            }}
            disabled={isStarting}
          >
            <View style={[styles.levelBar, { backgroundColor: levelLocked ? colors.border : section.level.tint }]} />

            <View style={styles.testBody}>
              <View style={styles.topRow}>
                {premiumLocked && !levelLocked ? (
                  <View style={styles.tag}>
                    <Ionicons name="lock-closed" size={9} color={colors.warn} />
                    <Text style={[styles.tagText, { color: colors.warn }]}>Premium</Text>
                  </View>
                ) : !levelLocked ? (
                  <View style={styles.tag}>
                    <Ionicons name="checkmark-circle" size={9} color={colors.success} />
                    <Text style={[styles.tagText, { color: colors.success }]}>Free</Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.testTitle, levelLocked && styles.testTitleLocked]} numberOfLines={1}>
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
              <View style={[styles.playWrap, levelLocked && styles.playWrapLocked]}>
                <Ionicons name={levelLocked ? "lock-closed" : "play"} size={13} color={levelLocked ? colors.slateSoft : colors.brand} />
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

  header: { marginTop: 6, marginBottom: spacing.md },
  chapterName: { ...type.h1, color: colors.ink },
  subjectName: { ...type.small, color: colors.slate, marginTop: 3 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: spacing.md, marginBottom: 10 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },
  sectionTitle: { ...type.h3, color: colors.ink },
  lockedTag: { flexDirection: "row", alignItems: "center", gap: 4, marginLeft: "auto" },
  lockedTagText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },
  comingSoonText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginLeft: "auto", fontStyle: "italic" },

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