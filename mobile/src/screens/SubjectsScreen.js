import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

export default function SubjectsScreen({ navigation }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/subjects/my");
      setSubjects(res.data.subjects);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Chapter-wise Practice</Text>
        <TouchableOpacity onPress={() => navigation.navigate("SelectSubjects")}>
          <Text style={styles.editLink}>Edit Subjects</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.subtitle}>Jo bhi chapter padha ho, uska test do — easy se advanced tak</Text>

      {subjects.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyEmoji}>📚</Text>
          <Text style={styles.emptyTitle}>Abhi koi subject select nahi kiya</Text>
          <Text style={styles.emptyText}>Apne subjects choose karo, phir har chapter ka test de sakoge</Text>
          <TouchableOpacity style={styles.selectButton} onPress={() => navigation.navigate("SelectSubjects")}>
            <Text style={styles.selectButtonText}>Subjects Select Karo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        subjects.map((subj) => {
          const pct = subj.totalChapters ? Math.round((subj.completedCount / subj.totalChapters) * 100) : 0;
          return (
            <TouchableOpacity
              key={subj._id}
              style={styles.subjectCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate("ChapterList", { subject: subj })}
            >
              <View style={styles.subjectTop}>
                <View style={styles.subjectIconWrap}>
                  <Text style={styles.subjectIcon}>{subj.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subj.name}</Text>
                  <Text style={styles.subjectProgress}>
                    {subj.completedCount}/{subj.totalChapters} chapters complete
                  </Text>
                </View>
                <View style={styles.pctBadge}>
                  <Text style={styles.pctText}>{pct}%</Text>
                </View>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateLight },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10 },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  editLink: { color: colors.brand, fontWeight: "600", fontSize: 13 },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 4, marginBottom: spacing.lg },
  emptyBox: { backgroundColor: "#fff", borderRadius: radius.xl, padding: spacing.xl, alignItems: "center", marginTop: spacing.lg },
  emptyEmoji: { fontSize: 40, marginBottom: spacing.sm },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", marginTop: 6, marginBottom: spacing.lg },
  selectButton: { backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 24 },
  selectButtonText: { color: "#fff", fontWeight: "700" },
  subjectCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectTop: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  subjectIconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectIcon: { fontSize: 24 },
  subjectName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  subjectProgress: { fontSize: 12, color: colors.slate, marginTop: 2 },
  pctBadge: {
    backgroundColor: colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pctText: { fontSize: 12, fontWeight: "800", color: colors.success },
  progressBarBg: { height: 6, backgroundColor: colors.slateLight, borderRadius: 3, overflow: "hidden" },
  progressBarFill: { height: 6, backgroundColor: colors.success, borderRadius: 3 },
});