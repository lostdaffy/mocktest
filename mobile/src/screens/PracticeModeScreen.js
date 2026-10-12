import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useColorScheme } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";
import { getColors, getCard, gradients, spacing, radius, shadow } from "../theme/theme";

// Opening a chapter asks one question first: practise the whole chapter
// (mixed questions), or one subtopic at a time. Only then does the level and
// test screen open, for that one choice - so it stays short instead of
// carrying a row of every subtopic above the tests.
//
// A chapter with no subtopics goes straight to its tests: there is nothing
// to choose. Drawn in the same style as the chapter list before it.

export default function PracticeModeScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const isDark = useColorScheme() === "dark";
  const colors = getColors(isDark);
  const card = getCard(isDark);
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
          // Every subtopic of the chapter, those still waiting for tests
          // included (a server before allSubtopics existed sends only the
          // ones with tests).
          const subtopics = res.data?.allSubtopics || res.data?.subtopics || [];
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
  const readyTopics = data.subtopics.filter((s) => s.tests > 0).length;
  const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xxl + insets.bottom }}
      >
        {/* HEADER - as on the chapter list */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
          <TouchableOpacity
            onPress={back}
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={[styles.headerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.ink }]} numberOfLines={1}>
              {view === "topics" ? "Subtopics" : "Practice"}
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.slateSoft }]} numberOfLines={1}>
              {subject}
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.brandTint, borderColor: colors.brandLight }]}>
            <Text style={[styles.countNumber, { color: colors.brand }]}>{data.subtopics.length}</Text>
            <Text style={[styles.countLabel, { color: colors.slate }]}>TOPICS</Text>
          </View>
        </View>

        {/* HERO */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { shadowColor: colors.brand }]}
          >
            <View pointerEvents="none" style={styles.heroOrbOne} />
            <View pointerEvents="none" style={styles.heroOrbTwo} />
            <View style={styles.heroIconOuter}>
              <View style={[styles.heroIconInner, { backgroundColor: colors.surface }]}>
                <Ionicons name={view === "topics" ? "list" : "layers"} size={22} color={colors.brand} />
              </View>
            </View>
            <View style={styles.heroContent}>
              <View style={styles.heroLabel}>
                <Ionicons name="book" size={10} color="#FFFFFF" />
                <Text style={styles.heroLabelText}>CHAPTER PRACTICE</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>
                {chapter}
              </Text>
              <Text style={styles.heroSubtitle}>
                {plural(data.chapterTests, "mixed test")} · {plural(data.subtopics.length, "subtopic")}
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* SECTION HEADER */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionCopy}>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              {view === "topics" ? "Choose a subtopic" : "How do you want to practise?"}
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.slate }]}>
              {view === "topics" ? "Practise one subtopic, level by level" : "Pick one - you can switch any time"}
            </Text>
          </View>
        </View>

        {view === "choose" ? (
          <>
            <ChoiceCard
              card={card}
              colors={colors}
              icon="shuffle"
              title="Mixed practice"
              text="Questions from the whole chapter, all subtopics together - like the real exam."
              meta={data.chapterTests ? plural(data.chapterTests, "test") : "Tests coming soon"}
              onPress={() => openTests("")}
            />
            <ChoiceCard
              card={card}
              colors={colors}
              icon="list"
              title="Subtopic-wise practice"
              text="Pick one subtopic and practise only that, level by level."
              meta={`${plural(data.subtopics.length, "subtopic")} · ${topicTests ? plural(topicTests, "test") : "tests coming soon"}`}
              onPress={() => setView("topics")}
            />
          </>
        ) : (
          data.subtopics.map((s, i) => {
            // A subtopic still waiting for its tests is listed, so the
            // student sees what is coming, but cannot be opened.
            const ready = s.tests > 0;
            return (
              <TouchableOpacity
                key={s.name}
                onPress={() => ready && openTests(s.name)}
                disabled={!ready}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityState={{ disabled: !ready }}
                style={[card, styles.card, !ready && styles.cardMuted]}
              >
                <View style={[styles.numberBox, { backgroundColor: colors.brandTint, borderColor: colors.brandLight }]}>
                  <Text style={[styles.numberText, { color: colors.brand }]}>{String(i + 1).padStart(2, "0")}</Text>
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.ink }]} numberOfLines={2}>
                    {s.name}
                  </Text>
                  <View style={styles.metaRow}>
                    <Ionicons
                      name={ready ? "document-text-outline" : "time-outline"}
                      size={11}
                      color={ready ? colors.brand : colors.slateSoft}
                    />
                    <Text style={[styles.metaText, { color: ready ? colors.brand : colors.slateSoft }]}>
                      {ready ? plural(s.tests, "test") : "Tests coming soon"}
                    </Text>
                  </View>
                </View>
                {ready && (
                  <View style={[styles.chevron, { backgroundColor: colors.slateLight }]}>
                    <Ionicons name="chevron-forward" size={15} color={colors.slate} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}

        {view === "topics" && readyTopics === 0 && (
          <Text style={[styles.note, { color: colors.slate }]}>
            Subtopic tests are being prepared. Mixed practice is open in the meantime.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

function ChoiceCard({ card, colors, icon, title, text, meta, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78} accessibilityRole="button" style={[card, styles.card, styles.choiceCard]}>
      <View style={[styles.choiceIcon, { backgroundColor: colors.brandTint, borderColor: colors.brandLight }]}>
        <Ionicons name={icon} size={22} color={colors.brand} />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>{title}</Text>
        <Text style={[styles.cardText, { color: colors.slate }]}>{text}</Text>
        <View style={[styles.pill, { backgroundColor: colors.brandTint }]}>
          <Text style={[styles.pillText, { color: colors.brand }]}>{meta}</Text>
        </View>
      </View>
      <View style={[styles.chevron, { backgroundColor: colors.slateLight }]}>
        <Ionicons name="chevron-forward" size={15} color={colors.slate} />
      </View>
    </TouchableOpacity>
  );
}

// Sizes and shapes copied from the chapter list (ChapterListScreen), so the
// two screens read as one flow.
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: { minHeight: 68, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm, flexDirection: "row", alignItems: "center" },
  headerButton: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", ...shadow.soft },
  headerCenter: { flex: 1, minWidth: 0, marginHorizontal: 12 },
  headerTitle: { fontSize: 18, lineHeight: 22, fontWeight: "800", letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 10, lineHeight: 14, fontWeight: "500", marginTop: 2 },
  countBadge: { minWidth: 52, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  countNumber: { fontSize: 13, lineHeight: 15, fontWeight: "800" },
  countLabel: { fontSize: 6.5, lineHeight: 9, fontWeight: "800", marginTop: 1, letterSpacing: 0.25 },

  heroWrap: { marginHorizontal: spacing.lg, marginBottom: 18 },
  hero: { minHeight: 128, borderRadius: radius.xl, padding: 17, flexDirection: "row", alignItems: "center", overflow: "hidden", ...shadow.brand },
  heroContent: { flex: 1, minWidth: 0, marginLeft: 13, zIndex: 5 },
  heroIconOuter: { width: 58, height: 58, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", zIndex: 5 },
  heroIconInner: { width: 46, height: 46, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  heroLabel: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: radius.full, backgroundColor: "rgba(255,255,255,0.14)", marginBottom: 6 },
  heroLabelText: { fontSize: 7, lineHeight: 10, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.4 },
  heroTitle: { fontSize: 19, lineHeight: 23, fontWeight: "800", color: "#FFFFFF", letterSpacing: -0.3 },
  heroSubtitle: { fontSize: 10, lineHeight: 14, color: "rgba(255,255,255,0.76)", marginTop: 3 },
  heroOrbOne: { position: "absolute", width: 155, height: 155, borderRadius: 80, right: -75, top: -75, backgroundColor: "rgba(255,255,255,0.08)" },
  heroOrbTwo: { position: "absolute", width: 90, height: 90, borderRadius: 45, right: 8, bottom: -52, backgroundColor: "rgba(255,255,255,0.06)" },

  sectionHeader: { marginHorizontal: spacing.lg, marginBottom: 11, flexDirection: "row", alignItems: "center" },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { fontSize: 19, lineHeight: 23, fontWeight: "800", letterSpacing: -0.3 },
  sectionSubtitle: { fontSize: 10, lineHeight: 14, fontWeight: "500", marginTop: 2 },

  card: { marginHorizontal: spacing.lg, marginBottom: 10, padding: 13, borderRadius: 19, borderWidth: 1, flexDirection: "row", alignItems: "center" },
  cardMuted: { opacity: 0.6 },
  choiceCard: { paddingVertical: 16 },
  choiceIcon: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 12 },
  numberBox: { width: 40, height: 40, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center", marginRight: 10 },
  numberText: { fontSize: 11, lineHeight: 14, fontWeight: "800" },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 15, lineHeight: 19, fontWeight: "800", letterSpacing: -0.2 },
  cardText: { fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 },
  metaText: { fontSize: 10.5, lineHeight: 14, fontWeight: "700" },
  pill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginTop: 8 },
  pillText: { fontSize: 10, lineHeight: 13, fontWeight: "800" },
  chevron: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  note: { marginHorizontal: spacing.lg, marginTop: 6, fontSize: 11.5, lineHeight: 16, textAlign: "center" },
});
