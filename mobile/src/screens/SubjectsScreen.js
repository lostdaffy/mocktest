import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function SubjectsScreen({ navigation }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/subjects/my");
      setSubjects(res.data.subjects || []);
    } catch (err) {
      // fail quietly
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  const totalChapters = subjects.reduce((sum, s) => sum + (s.totalChapters || 0), 0);
  const doneChapters = subjects.reduce((sum, s) => sum + (s.completedCount || 0), 0);
  const overall = totalChapters ? Math.round((doneChapters / totalChapters) * 100) : 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Practice</Text>
      <Text style={styles.subtitle}>Chapter-wise tests — easy to advanced</Text>

      {/* Overall progress */}
      {subjects.length > 0 && (
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.overallCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.overallLabel}>OVERALL PROGRESS</Text>
            <Text style={styles.overallValue}>{overall}%</Text>
            <Text style={styles.overallSub}>
              {doneChapters} of {totalChapters} chapters completed
            </Text>
          </View>
          <View style={styles.overallRing}>
            <Text style={styles.overallRingText}>{overall}%</Text>
          </View>
        </LinearGradient>
      )}

      {subjects.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="book-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>No subjects selected</Text>
          <Text style={styles.emptyText}>Pick the subjects you're studying to get chapter-wise practice</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => navigation.navigate("SelectSubjects")} activeOpacity={0.85}>
            <Text style={styles.emptyButtonText}>Choose Subjects</Text>
            <Ionicons name="arrow-forward" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your subjects</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{subjects.length}</Text>
            </View>
          </View>

          {subjects.map((subj) => {
            const pct = subj.totalChapters ? Math.round((subj.completedCount / subj.totalChapters) * 100) : 0;
            return (
              <TouchableOpacity
                key={subj._id}
                style={styles.subjectCard}
                activeOpacity={0.75}
                onPress={() => navigation.navigate("ChapterList", { subject: subj })}
              >
                <View style={styles.subjectTop}>
                  <View style={styles.subjectIconWrap}>
                    <Text style={styles.subjectIcon}>{subj.icon}</Text>
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{subj.name}</Text>
                    <Text style={styles.subjectMeta}>
                      {subj.completedCount}/{subj.totalChapters} chapters
                    </Text>
                  </View>

                  <View style={[styles.pctBadge, pct === 100 && styles.pctBadgeDone]}>
                    <Text style={[styles.pctText, pct === 100 && styles.pctTextDone]}>{pct}%</Text>
                  </View>
                </View>

                <View style={styles.barBg}>
                  <LinearGradient
                    colors={pct === 100 ? gradients.success : gradients.brand}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.barFill, { width: `${Math.max(pct, 2)}%` }]}
                  />
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Add-more tile - sits right where the student is already looking,
              styled distinctly (dashed border, no progress bar) so it visually
              reads as "the next slot," not another subject. */}
          <TouchableOpacity
            style={styles.addCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("SelectSubjects")}
          >
            <View style={styles.addIconWrap}>
              <Ionicons name="add" size={22} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addTitle}>Add more subjects</Text>
              <Text style={styles.addSub}>Or remove ones you're done with</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slateSoft} />
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  title: { ...type.h1, color: colors.ink, marginTop: 6 },
  subtitle: { ...type.small, color: colors.slate, marginTop: 4, marginBottom: spacing.md },

  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.xl,
    padding: spacing.md,
    marginBottom: spacing.lg,
    ...shadow.brand,
  },
  overallLabel: { ...type.micro, color: "rgba(255,255,255,0.7)" },
  overallValue: { fontSize: 30, fontWeight: "800", color: "#fff", marginTop: 3, letterSpacing: -0.5 },
  overallSub: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  overallRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  overallRingText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  sectionTitle: { ...type.h3, color: colors.ink },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: { fontSize: 12, fontWeight: "800", color: colors.brand },

  subjectCard: { ...card, padding: spacing.md, marginBottom: 10 },
  subjectTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  subjectIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.brandTint,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.brandLight,
  },
  subjectIcon: { fontSize: 22 },
  subjectName: { ...type.h3, color: colors.ink },
  subjectMeta: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 2 },

  pctBadge: { backgroundColor: colors.brandLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  pctBadgeDone: { backgroundColor: colors.successLight },
  pctText: { fontSize: 12, fontWeight: "800", color: colors.brand },
  pctTextDone: { color: colors.success },

  barBg: { height: 6, backgroundColor: colors.slateLight, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },

  addCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.brandLight,
    backgroundColor: colors.brandTint,
    marginTop: 4,
  },
  addIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  addTitle: { ...type.bodyStrong, color: colors.brand },
  addSub: { ...type.tiny, color: colors.slate, fontWeight: "500", marginTop: 2 },

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
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.brand,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: radius.md,
    marginTop: 6,
    ...shadow.brand,
  },
  emptyButtonText: { color: "#fff", ...type.bodyStrong },
});