import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radius } from "../theme/theme";

const LEVEL_META = {
  easy: { label: "Easy", tint: colors.success, bg: colors.successLight },
  medium: { label: "Medium", tint: "#0284C7", bg: "#E0F2FE" },
  hard: { label: "Hard", tint: "#EA580C", bg: "#FFF7ED" },
  advanced: { label: "Advanced", tint: "#7C3AED", bg: "#F3E8FF" },
};

export default function ChapterListScreen({ route, navigation }) {
  const { subject } = route.params;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
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
        <Text style={styles.infoText}>
          Har chapter easy se shuru hota hai. Achha score karo to next level unlock hota hai.
        </Text>
      </View>

      {subject.chapters.map((ch, idx) => {
        const meta = LEVEL_META[ch.currentLevel] || LEVEL_META.easy;
        return (
          <TouchableOpacity
            key={idx}
            style={styles.chapterCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("ChapterPractice", { subject: subject.name, chapter: ch.name })}
          >
            <View style={{ flex: 1 }}>
              <View style={styles.chapterTitleRow}>
                <Text style={styles.chapterName} numberOfLines={1}>
                  {ch.name}
                </Text>
                {ch.isCompleted && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
              </View>

              <View style={styles.metaRow}>
                <View style={[styles.levelBadge, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.levelBadgeText, { color: meta.tint }]}>{meta.label}</Text>
                </View>
                {ch.testsCompleted > 0 ? (
                  <Text style={styles.chapterMeta}>
                    Best {ch.bestAccuracy}% · {ch.testsCompleted} test{ch.testsCompleted > 1 ? "s" : ""}
                  </Text>
                ) : (
                  <Text style={styles.chapterMetaNew}>Abhi shuru nahi kiya</Text>
                )}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.slate} />
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },

  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: 8, marginBottom: spacing.md },
  subjectIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectIcon: { fontSize: 26 },
  subjectName: { fontSize: 21, fontWeight: "800", color: colors.ink },
  subjectMeta: { fontSize: 13, color: colors.slate, marginTop: 2 },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.brandLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.brand, lineHeight: 17 },

  chapterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chapterTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterName: { fontSize: 15, fontWeight: "700", color: colors.ink, flexShrink: 1 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  levelBadgeText: { fontSize: 10, fontWeight: "800" },
  chapterMeta: { fontSize: 11, color: colors.slate },
  chapterMetaNew: { fontSize: 11, color: colors.slate, fontStyle: "italic" },
});