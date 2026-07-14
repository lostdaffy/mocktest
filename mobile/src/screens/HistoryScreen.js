import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius, type, card } from "../theme/theme";

export default function HistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/tests/my-attempts");
      setHistory(res.data.attempts || []);
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
      data={history}
      keyExtractor={(item) => item.attemptId}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      ListHeaderComponent={
        history.length > 0 ? (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Test History</Text>
            <Text style={styles.headerSub}>
              {history.length} attempt{history.length > 1 ? "s" : ""} · tap any to review
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={26} color={colors.slateSoft} />
          </View>
          <Text style={styles.emptyTitle}>No attempts yet</Text>
          <Text style={styles.emptyText}>Take your first test — your history and progress will show up here</Text>
        </View>
      }
      renderItem={({ item }) => {
        const pct = item.totalMarks > 0 ? Math.round((item.score / item.totalMarks) * 100) : 0;
        const tint = pct >= 60 ? colors.success : pct >= 40 ? colors.hard : colors.danger;

        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.75}
            onPress={() => navigation.navigate("Result", { attemptId: item.attemptId })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.testTitle}
              </Text>

              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={11} color={colors.slateSoft} />
                <Text style={styles.meta}>
                  {new Date(item.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </Text>
                <View style={styles.dot} />
                <Ionicons name="checkmark-circle" size={11} color={colors.success} />
                <Text style={styles.meta}>{item.correctCount}</Text>
                <Ionicons name="close-circle" size={11} color={colors.danger} />
                <Text style={styles.meta}>{item.wrongCount}</Text>
              </View>

              <View style={styles.barBg}>
                <View style={[styles.barFill, { width: `${Math.max(pct, 2)}%`, backgroundColor: tint }]} />
              </View>
            </View>

            <View style={styles.scoreBox}>
              <Text style={[styles.scoreValue, { color: tint }]}>{item.score}</Text>
              <Text style={styles.scoreOutOf}>/{item.totalMarks}</Text>
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

  header: { marginTop: 6, marginBottom: spacing.md },
  headerTitle: { ...type.h1, color: colors.ink },
  headerSub: { ...type.small, color: colors.slate, marginTop: 4 },

  card: { ...card, flexDirection: "row", alignItems: "center", gap: 14, padding: spacing.md, marginBottom: 10 },
  title: { ...type.bodyStrong, color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginBottom: 8 },
  meta: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border, marginHorizontal: 3 },

  barBg: { height: 5, backgroundColor: colors.slateLight, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },

  scoreBox: { alignItems: "center", minWidth: 54 },
  scoreValue: { fontSize: 22, fontWeight: "800" },
  scoreOutOf: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },

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
