import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import AppAlert from "./AppAlert";
import { colors } from "../theme/theme";
import { isSubscribed } from "../utils/subscription";

// "Continue learning" on Home - one tap back into studying.
//
// Up to three short rows (GET /tests/continue):
//  - "Up next": the next test of the series they last practised, Start;
//  - then the tests they used most recently - a half-done one shows how far
//    they got and Resume, a finished one its score and Review.
// For someone who has not taken a test yet, one row into Practice.

const TYPE = {
  practice: { label: "Practice", icon: "book" },
  topic_wise: { label: "Practice", icon: "book" },
  sectional: { label: "Practice", icon: "book" },
  full_mock: { label: "Mock", icon: "document-text" },
  pyq: { label: "PYQ", icon: "library" },
  revision: { label: "Revision", icon: "refresh" },
  quiz: { label: "Daily Quiz", icon: "flash" },
};

// "Percentage · Mixed Practice · Easy #2" -> "Mixed Practice · Easy #2"
function shortTitle(title, chapter) {
  const t = String(title || "");
  return chapter && t.startsWith(`${chapter} · `) ? t.slice(chapter.length + 3) : t;
}

export default function ContinueCard({ navigation, user }) {
  const [data, setData] = useState(undefined); // undefined = loading
  const [starting, setStarting] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get("/tests/continue")
        .then((res) => alive && setData(res.data || {}))
        .catch(() => alive && setData({}));
      return () => {
        alive = false;
      };
    }, [])
  );

  async function open(testId, isFree) {
    if (!isFree && !isSubscribed(user)) {
      AppAlert.alert("Premium test", "Upgrade to unlock every test.", [
        { text: "Later", style: "cancel" },
        { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
      ]);
      return;
    }
    setStarting(String(testId));
    try {
      const res = await api.get(`/tests/${testId}`);
      navigation.navigate("TestTaking", { testId: res.data?.test?._id || testId });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        AppAlert.alert("Premium test", err.response.data.message || "Upgrade to unlock this test.", [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else if (err.response?.data?.code !== "UPDATE_REQUIRED") {
        AppAlert.alert("Something went wrong", err.response?.data?.message || "Couldn't open the test.");
      }
    } finally {
      setStarting(null);
    }
  }

  if (data === undefined) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  }

  const next = data.item?.kind === "next" && data.item.next ? data.item : null;
  const recent = (data.recent || []).slice(0, next ? 2 : 3);

  // Nothing taken yet
  if (!next && !recent.length) {
    return (
      <TouchableOpacity style={[styles.card, styles.row]} activeOpacity={0.85} onPress={() => navigation.navigate("PracticeTab")}>
        <View style={styles.icon}>
          <Ionicons name="rocket" size={17} color={colors.brand} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            Start practising
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Easy to Advanced, 20 Qs each
          </Text>
        </View>
        <View style={styles.primary}>
          <Text style={styles.primaryText}>Begin</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.card}>
      {next && (
        <View style={[styles.row, styles.rowNext]}>
          <View style={[styles.icon, { backgroundColor: colors.brand }]}>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </View>
          <View style={styles.body}>
            <Text style={styles.eyebrow} numberOfLines={1}>
              UP NEXT · {next.chapter.toUpperCase()}
            </Text>
            <Text style={styles.title} numberOfLines={1}>
              {shortTitle(next.next.title, next.chapter)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.primary}
            activeOpacity={0.85}
            disabled={!!starting}
            onPress={() => open(next.next.testId, next.next.isFree)}
            accessibilityRole="button"
          >
            {starting === String(next.next.testId) ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                {!next.next.isFree && !isSubscribed(user) && <Ionicons name="lock-closed" size={11} color="#FFFFFF" />}
                <Text style={styles.primaryText}>Start</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {recent.map((t, i) => {
        const look = t.dailyQuiz ? TYPE.quiz : TYPE[t.type] || TYPE.practice;
        const good = (t.accuracy || 0) >= 60;
        return (
          <View key={String(t.testId)} style={[styles.row, (i > 0 || next) && styles.divider]}>
            <View style={styles.icon}>
              <Ionicons name={look.icon} size={16} color={colors.brand} />
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {t.title}
              </Text>
              {t.inProgress ? (
                <Text style={styles.sub} numberOfLines={1}>
                  {look.label} · In progress · {t.answered}/{t.total} answered
                </Text>
              ) : (
                <Text style={styles.sub} numberOfLines={1}>
                  {look.label} · <Text style={{ color: good ? colors.success : colors.warn, fontWeight: "800" }}>{t.accuracy}%</Text>
                </Text>
              )}
            </View>
            {t.inProgress ? (
              <TouchableOpacity
                style={styles.primary}
                activeOpacity={0.85}
                disabled={!!starting}
                onPress={() => open(t.testId, true)}
                accessibilityRole="button"
              >
                {starting === String(t.testId) ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryText}>Resume</Text>}
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.ghost}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Result", { attemptId: t.attemptId })}
                accessibilityRole="button"
              >
                <Text style={styles.ghostText}>Review</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  loading: { justifyContent: "center", alignItems: "center", minHeight: 64 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingHorizontal: 12, paddingVertical: 10 },
  rowNext: { backgroundColor: colors.brandTint },
  divider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  icon: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.brandLight, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 9.5, fontWeight: "800", letterSpacing: 0.6, color: colors.brand },
  title: { fontSize: 13.5, fontWeight: "800", color: colors.ink, marginTop: 1 },
  sub: { fontSize: 11.5, fontWeight: "600", color: colors.slate, marginTop: 2 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 72,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  primaryText: { fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" },
  ghost: {
    minWidth: 72,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brandLight,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: { fontSize: 12.5, fontWeight: "800", color: colors.brand },
});
