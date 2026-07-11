import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

// Each exam gets its own icon + accent so the list is scannable at a glance.
const EXAM_META = {
  SSC_CGL: { icon: "school", tint: "#1053F3", bg: "#E8EFFE" },
  SSC_MTS: { icon: "briefcase", tint: "#059669", bg: "#ECFDF5" },
  SSC_CHSL: { icon: "document-text", tint: "#7C3AED", bg: "#F3E8FF" },
  UP_POLICE: { icon: "shield-checkmark", tint: "#DC2626", bg: "#FEF2F2" },
  RAILWAY: { icon: "train", tint: "#EA580C", bg: "#FFF7ED" },
  BANKING: { icon: "card", tint: "#0891B2", bg: "#ECFEFF" },
  CTET: { icon: "person", tint: "#DB2777", bg: "#FDF2F8" },
};

export default function ExamPickerScreen({ navigation }) {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/exams");
      setExams(res.data.patterns || res.data.exams || []);
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
    <FlatList
      style={styles.container}
      data={exams}
      keyExtractor={(item) => item.examType}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Mock Test Series</Text>
          <Text style={styles.subtitle}>Apna exam choose karo — poori mock series ready hai</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="document-outline" size={40} color={colors.slate} />
          <Text style={styles.emptyText}>Abhi koi exam available nahi hai</Text>
        </View>
      }
      renderItem={({ item }) => {
        const meta = EXAM_META[item.examType] || { icon: "book", tint: colors.brand, bg: colors.brandLight };
        return (
          <TouchableOpacity
            style={styles.examCard}
            activeOpacity={0.7}
            onPress={() =>
              navigation.navigate("ExamSeries", {
                examStage: item.examType,
                examName: item.displayName || item.examType,
              })
            }
          >
            <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
              <Ionicons name={meta.icon} size={22} color={meta.tint} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.examName}>{item.displayName || item.examType}</Text>
              <View style={styles.metaRow}>
                {item.durationMinutes ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.slate} />
                    <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                  </View>
                ) : null}
                {item.sections?.length ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="layers-outline" size={12} color={colors.slate} />
                    <Text style={styles.metaText}>{item.sections.length} sections</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={colors.slate} />
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
  title: { fontSize: 22, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 4 },

  examCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  examName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { fontSize: 11, color: colors.slate },

  empty: { alignItems: "center", paddingVertical: 60, gap: spacing.sm },
  emptyText: { color: colors.slate, fontSize: 14 },
});