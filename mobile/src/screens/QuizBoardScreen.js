import { useCallback, useLayoutEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

// Today's Daily GK Quiz ranking. Everyone answers the same 20 questions, so
// the day has a real order: the top ten, and where this student stands.
// A student's first try is what counts (see server/services/engagement.js).

const MEDALS = ["🥇", "🥈", "🥉"];

// Blank when the app did not report a time, rather than "0m 00s".
function time(seconds) {
  if (!seconds) return "";
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, "0")}s`;
}

export default function QuizBoardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [board, setBoard] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/tests/daily-quiz/board");
      setBoard(res.data);
    } catch {
      setBoard({ participants: 0, top: [], me: null });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const meInTop = board?.top?.some((t) => t.isMe);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={20} color={colors.ink} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Today's ranking</Text>
          <Text style={styles.subtitle}>Daily GK Quiz · first try counts</Text>
        </View>
      </View>

      {!board ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.brand} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl + insets.bottom }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={colors.brand}
            />
          }
        >
          {board.me ? (
            <View style={styles.meCard}>
              <Text style={styles.meLabel}>YOUR RANK TODAY</Text>
              <Text style={styles.meRank}>
                #{board.me.rank}
                <Text style={styles.meOf}> of {board.participants}</Text>
              </Text>
              <Text style={styles.meMeta}>
                {board.me.correct} correct{board.me.seconds ? ` · ${time(board.me.seconds)}` : ""}
              </Text>
            </View>
          ) : (
            <View style={styles.meCard}>
              <Text style={styles.meLabel}>NOT TAKEN YET</Text>
              <Text style={styles.meMeta}>Take today's quiz from Home to get your rank.</Text>
            </View>
          )}

          <Text style={styles.section}>
            Top {Math.min(10, board.participants)} · {board.participants} student{board.participants === 1 ? "" : "s"} today
          </Text>

          {board.top.length === 0 && <Text style={styles.empty}>Nobody has finished today's quiz yet. Be the first!</Text>}

          {board.top.map((row) => (
            <View key={row.rank} style={[styles.row, row.isMe && styles.rowMe]}>
              <Text style={styles.rank}>{MEDALS[row.rank - 1] || `#${row.rank}`}</Text>
              <Text style={[styles.name, row.isMe && styles.nameMe]} numberOfLines={1}>
                {row.isMe ? `${row.name} (you)` : row.name}
              </Text>
              <Text style={styles.score}>{row.correct}</Text>
              <Text style={styles.time}>{time(row.seconds)}</Text>
            </View>
          ))}

          {board.me && !meInTop && (
            <View style={[styles.row, styles.rowMe, { marginTop: spacing.sm }]}>
              <Text style={styles.rank}>#{board.me.rank}</Text>
              <Text style={[styles.name, styles.nameMe]}>You</Text>
              <Text style={styles.score}>{board.me.correct}</Text>
              <Text style={styles.time}>{time(board.me.seconds)}</Text>
            </View>
          )}

          <Text style={styles.footer}>A new quiz goes live every day at 12:00 AM. Come back tomorrow to climb the board.</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  back: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 11, color: colors.slate, marginTop: 2 },
  meCard: { backgroundColor: colors.brand, borderRadius: radius.xl, padding: spacing.lg, alignItems: "center" },
  meLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, color: "rgba(255,255,255,0.8)" },
  meRank: { fontSize: 40, fontWeight: "900", color: "#FFFFFF", marginTop: 4 },
  meOf: { fontSize: 16, fontWeight: "700", color: "rgba(255,255,255,0.8)" },
  meMeta: { fontSize: 13, color: "rgba(255,255,255,0.9)", marginTop: 4, textAlign: "center" },
  section: { fontSize: 13, fontWeight: "800", color: colors.ink, marginTop: spacing.lg, marginBottom: spacing.sm },
  empty: { fontSize: 13, color: colors.slate, textAlign: "center", marginVertical: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 6 },
  rowMe: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  rank: { width: 40, fontSize: 15, fontWeight: "800", color: colors.ink },
  name: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.ink },
  nameMe: { color: colors.brand },
  score: { width: 32, textAlign: "right", fontSize: 14, fontWeight: "800", color: colors.success },
  time: { width: 64, textAlign: "right", fontSize: 12, color: colors.slate },
  footer: { fontSize: 12, color: colors.slate, textAlign: "center", marginTop: spacing.lg },
});
