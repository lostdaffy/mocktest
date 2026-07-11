import { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

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
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
      ListHeaderComponent={
        history.length > 0 ? (
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Test History</Text>
            <Text style={styles.headerSub}>
              {history.length} test{history.length > 1 ? "s" : ""} diye — progress dekho
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={40} color={colors.slate} />
          <Text style={styles.emptyTitle}>Abhi koi test nahi diya</Text>
          <Text style={styles.emptyText}>Pehla test do — yahan history aur progress dikhegi</Text>
        </View>
      }
      renderItem={({ item }) => {
        const pct = item.totalMarks > 0 ? Math.round((item.score / item.totalMarks) * 100) : 0;
        const tint = pct >= 60 ? colors.success : pct >= 40 ? "#EA580C" : colors.danger;

        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("Result", { attemptId: item.attemptId })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>
                {item.testTitle}
              </Text>

              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={11} color={colors.slate} />
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
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: tint }]} />
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
  container: { flex: 1, backgroundColor: colors.slateLight },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateLight },

  header: { marginTop: 8, marginBottom: spacing.md },
  headerTitle: { fontSize: 21, fontWeight: "800", color: colors.ink },
  headerSub: { fontSize: 13, color: colors.slate, marginTop: 3 },

  card: {
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
  title: { fontSize: 14, fontWeight: "700", color: colors.ink },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5, marginBottom: 7 },
  meta: { fontSize: 11, color: colors.slate },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: colors.border, marginHorizontal: 2 },

  barBg: { height: 5, backgroundColor: colors.slateLight, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3 },

  scoreBox: { alignItems: "center", minWidth: 52 },
  scoreValue: { fontSize: 22, fontWeight: "800" },
  scoreOutOf: { fontSize: 11, color: colors.slate },

  empty: { alignItems: "center", paddingVertical: 70, gap: spacing.sm },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate, textAlign: "center", paddingHorizontal: spacing.lg },
});