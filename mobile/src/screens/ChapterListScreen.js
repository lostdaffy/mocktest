import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius, type, card } from "../theme/theme";

// Order matters - this IS the ladder a student climbs through.
const LEVELS = [
  { key: "easy", label: "Easy", tint: colors.easy },
  { key: "medium", label: "Medium", tint: colors.medium },
  { key: "hard", label: "Hard", tint: colors.hard },
  { key: "advanced", label: "Advanced", tint: colors.advanced },
];

export default function ChapterListScreen({ route, navigation }) {
  const { subject } = route.params;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.subjectIconWrap}>
          <Text style={styles.subjectIcon}>{subject.icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.subjectName}>{subject.name}</Text>
          <Text style={styles.subjectMeta}>{subject.chapters?.length || 0} chapters</Text>
        </View>
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="trending-up" size={15} color={colors.brand} />
        <Text style={styles.infoText}>Every chapter starts at Easy. Clear it to unlock the next level.</Text>
      </View>

      {subject.chapters.map((ch, idx) => {
        const started = ch.testsCompleted > 0;
        const levelIdx = LEVELS.findIndex((l) => l.key === ch.currentLevel);
        const activeLevel = LEVELS[levelIdx] || LEVELS[0];

        return (
          <TouchableOpacity
            key={idx}
            style={styles.chapterCard}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate("ChapterPractice", {
                subject: subject.name,
                chapter: ch.name,
                currentLevel: ch.currentLevel,
                isCompleted: ch.isCompleted,
              })
            }
          >
            <View style={styles.chapterTop}>
              <View style={{ flex: 1 }}>
                <View style={styles.chapterTitleRow}>
                  <Text style={styles.chapterName} numberOfLines={1}>
                    {ch.name}
                  </Text>
                  {ch.isCompleted && <Ionicons name="trophy" size={14} color={colors.warn} />}
                </View>

                {started ? (
                  <Text style={styles.chapterMeta}>
                    Best {ch.bestAccuracy}% · {ch.testsCompleted} test{ch.testsCompleted > 1 ? "s" : ""} taken
                  </Text>
                ) : (
                  <Text style={styles.chapterMetaNew}>Not started yet</Text>
                )}
              </View>

              <View style={styles.chevWrap}>
                <Ionicons name="chevron-forward" size={15} color={colors.slate} />
              </View>
            </View>

            {/* Progress ladder - the level you're ON, not a difficulty rating of the chapter */}
            <View style={styles.ladder}>
              {LEVELS.map((lvl, i) => {
                const isPast = ch.isCompleted || i < levelIdx;
                const isCurrent = !ch.isCompleted && i === levelIdx;
                const filled = isPast || isCurrent;

                return (
                  <View key={lvl.key} style={styles.ladderStep}>
                    <View
                      style={[
                        styles.ladderBar,
                        filled && { backgroundColor: ch.isCompleted ? colors.warn : lvl.tint },
                        isCurrent && styles.ladderBarCurrent,
                      ]}
                    />
                    <Text
                      style={[
                        styles.ladderLabel,
                        filled && { color: ch.isCompleted ? colors.warn : lvl.tint, fontWeight: "700" },
                      ]}
                    >
                      {lvl.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 6, marginBottom: spacing.md },
  subjectIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brandLight,
  },
  subjectIcon: { fontSize: 25 },
  subjectName: { ...type.h1, color: colors.ink },
  subjectMeta: { ...type.small, color: colors.slate, marginTop: 2 },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTint,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brandLight,
  },
  infoText: { flex: 1, ...type.small, color: colors.brand, lineHeight: 18, fontWeight: "600" },

  chapterCard: { ...card, padding: spacing.md, marginBottom: 10 },
  chapterTop: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 13 },
  chapterTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterName: { ...type.h3, color: colors.ink, flexShrink: 1 },
  chapterMeta: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 3 },
  chapterMetaNew: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 3, fontStyle: "italic" },
  chevWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },

  ladder: { flexDirection: "row", gap: 6 },
  ladderStep: { flex: 1, alignItems: "center", gap: 4 },
  ladderBar: { height: 4, width: "100%", borderRadius: 2, backgroundColor: colors.slateLight },
  ladderBarCurrent: { height: 5 },
  ladderLabel: { fontSize: 9, fontWeight: "600", color: colors.slateSoft },
});