import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, spacing, radius, type, shadow, card } from "../theme/theme";

// Per-exam identity so the list is scannable at a glance.
const EXAM_META = {
  SSC_CGL: { icon: "school", grad: ["#3B7BFF", "#1053F3"] },
  SSC_MTS: { icon: "briefcase", grad: ["#10B981", "#059669"] },
  SSC_CHSL: { icon: "document-text", grad: ["#A78BFA", "#7C3AED"] },
  UP_POLICE: { icon: "shield-checkmark", grad: ["#F87171", "#DC2626"] },
  RAILWAY: { icon: "train", grad: ["#FB923C", "#EA580C"] },
  BANKING: { icon: "card", grad: ["#22D3EE", "#0891B2"] },
  CTET: { icon: "person", grad: ["#F472B6", "#DB2777"] },
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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>Mock Tests</Text>
          <Text style={styles.subtitle}>Full-length papers that mirror the real exam pattern</Text>
        </View>
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="document-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>No exams available yet</Text>
          <Text style={styles.emptyText}>Check back shortly — new mock series are on the way</Text>
        </View>
      }
      renderItem={({ item }) => {
        const meta = EXAM_META[item.examType] || { icon: "book", grad: ["#3B7BFF", "#1053F3"] };
        const totalQs = item.sections?.reduce((sum, s) => sum + (s.questionCount || 0), 0);

        return (
          <TouchableOpacity
            style={styles.examCard}
            activeOpacity={0.75}
            onPress={() =>
              navigation.navigate("ExamSeries", {
                examStage: item.examType,
                examName: item.displayName || item.examType,
              })
            }
          >
            <LinearGradient colors={meta.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.iconWrap}>
              <Ionicons name={meta.icon} size={22} color="#fff" />
            </LinearGradient>

            <View style={{ flex: 1 }}>
              <Text style={styles.examName}>{item.displayName || item.examType}</Text>
              <View style={styles.metaRow}>
                {totalQs ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="help-circle-outline" size={12} color={colors.slateSoft} />
                    <Text style={styles.metaText}>{totalQs} questions</Text>
                  </View>
                ) : null}
                {item.durationMinutes ? (
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.slateSoft} />
                    <Text style={styles.metaText}>{item.durationMinutes} min</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.chevWrap}>
              <Ionicons name="chevron-forward" size={16} color={colors.slate} />
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  header: { marginTop: 6, marginBottom: spacing.lg },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.small, color: colors.slate, marginTop: 5, lineHeight: 18 },

  examCard: { ...card, flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.md, marginBottom: 10 },
  iconWrap: { width: 48, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", ...shadow.sm },
  examName: { ...type.h3, color: colors.ink },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 5 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  metaText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },
  chevWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },

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
  emptyText: { ...type.small, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.xl },
});
