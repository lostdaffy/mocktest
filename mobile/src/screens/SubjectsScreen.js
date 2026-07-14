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
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Practice</Text>
          <Text style={styles.subtitle}>Chapter-wise tests — easy to advanced</Text>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={() => navigation.navigate("SelectSubjects")} activeOpacity={0.7}>
          <Ionicons name="options-outline" size={16} color={colors.brand} />
        </TouchableOpacity>
      </View>

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
          <Text style={styles.sectionTitle}>Your subjects</Text>
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
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  headerRow: { flexDirection: "row", alignItems: "center", marginTop: 6, marginBottom: spacing.md },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.small, color: colors.slate, marginTop: 4 },
  editButton: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },

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

  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: 12 },

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
