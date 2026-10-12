import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useColorScheme } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";
import { getColors, spacing, radius } from "../theme/theme";

// Opening a chapter asks one question first: practise the whole chapter
// (mixed questions), or one subtopic at a time. Only then does the level and
// test screen open, for that one choice - so it stays short instead of
// carrying a row of every subtopic above the tests.
//
// A chapter with no subtopic tests yet goes straight to its tests: there is
// nothing to choose.

export default function PracticeModeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const colors = getColors(useColorScheme() === "dark");
  const { subject, chapter, currentLevel, isCompleted } = route.params || {};

  const [data, setData] = useState(null); // { chapterTests, subtopics }
  const [view, setView] = useState("choose"); // "choose" | "topics"

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const openTests = useCallback(
    (series, replace = false) => {
      const params = { subject, chapter, currentLevel, isCompleted, series };
      if (replace) navigation.replace("ChapterPractice", params);
      else navigation.navigate("ChapterPractice", params);
    },
    [navigation, subject, chapter, currentLevel, isCompleted]
  );

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get(`/tests/practice-series/${encodeURIComponent(subject || "")}/${encodeURIComponent(chapter || "")}`)
        .then((res) => {
          if (!alive) return;
          const subtopics = res.data?.subtopics || [];
          if (!subtopics.length) return openTests("", true);
          setData({ chapterTests: res.data?.chapterTests || 0, subtopics });
        })
        .catch(() => alive && openTests("", true));
      return () => {
        alive = false;
      };
    }, [subject, chapter, openTests])
  );

  const back = () => (view === "topics" ? setView("choose") : navigation.goBack());

  // The phone's own back button, too: from the subtopic list it returns to
  // the two choices, not out of the chapter.
  useEffect(() => {
    if (view !== "topics") return undefined;
    return navigation.addListener("beforeRemove", (e) => {
      e.preventDefault();
      setView("choose");
    });
  }, [navigation, view]);

  if (!data) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const topicTests = data.subtopics.reduce((n, s) => n + s.tests, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) + spacing.sm }]}>
        <TouchableOpacity
          onPress={back}
          activeOpacity={0.72}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.ink }]} numberOfLines={1}>
            {view === "topics" ? "Choose a subtopic" : chapter}
          </Text>
          <Text style={[styles.subtitle, { color: colors.slate }]} numberOfLines={1}>
            {view === "topics" ? chapter : `${subject} · How do you want to practise?`}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}>
        {view === "choose" ? (
          <>
            <OptionCard
              colors={colors}
              icon="shuffle"
              title="Mixed practice"
              text="Questions from the whole chapter, all subtopics together - like the real exam."
              meta={`${data.chapterTests} test${data.chapterTests === 1 ? "" : "s"}`}
              onPress={() => openTests("")}
            />
            <OptionCard
              colors={colors}
              icon="list"
              title="Subtopic-wise practice"
              text="Pick one subtopic and practise only that, level by level."
              meta={`${data.subtopics.length} subtopic${data.subtopics.length === 1 ? "" : "s"} · ${topicTests} test${topicTests === 1 ? "" : "s"}`}
              onPress={() => setView("topics")}
            />
          </>
        ) : (
          data.subtopics.map((s, i) => (
            <TouchableOpacity
              key={s.name}
              onPress={() => openTests(s.name)}
              activeOpacity={0.8}
              accessibilityRole="button"
              style={[styles.topicRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <View style={[styles.topicNumber, { backgroundColor: colors.brandTint }]}>
                <Text style={[styles.topicNumberText, { color: colors.brand }]}>{String(i + 1).padStart(2, "0")}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.topicName, { color: colors.ink }]}>{s.name}</Text>
                <Text style={[styles.topicMeta, { color: colors.slate }]}>
                  {s.tests} test{s.tests === 1 ? "" : "s"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.slate} />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

function OptionCard({ colors, icon, title, text, meta, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      style={[styles.option, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={[styles.optionIcon, { backgroundColor: colors.brandTint }]}>
        <Ionicons name={icon} size={24} color={colors.brand} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.optionTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.optionText, { color: colors.slate }]}>{text}</Text>
        <Text style={[styles.optionMeta, { color: colors.brand }]}>{meta}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.slate} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  backButton: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 13, marginTop: 2 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    marginBottom: spacing.md,
  },
  optionIcon: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  optionTitle: { fontSize: 17, fontWeight: "800" },
  optionText: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  optionMeta: { fontSize: 12, fontWeight: "700", marginTop: 8 },
  topicRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  topicNumber: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  topicNumberText: { fontSize: 13, fontWeight: "800" },
  topicName: { fontSize: 15, fontWeight: "700" },
  topicMeta: { fontSize: 12, marginTop: 2 },
});
