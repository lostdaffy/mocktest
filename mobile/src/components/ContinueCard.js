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
//  - a test left half-way: how far they got, and Resume;
//  - else the next test of the series they last practised, with the score of
//    the last one (tap it to review) - Start opens the test straight away,
//    no hunting through chapter lists;
//  - else, for someone who has not practised yet, a way into Practice.
// The server decides which (GET /tests/continue).

// "Percentage · Mixed Practice · Easy #2" -> "Mixed Practice · Easy #2"
function shortTitle(title, chapter) {
  const t = String(title || "");
  return chapter && t.startsWith(`${chapter} · `) ? t.slice(chapter.length + 3) : t;
}

export default function ContinueCard({ navigation, user }) {
  const [item, setItem] = useState(undefined); // undefined = loading, null = nothing yet
  const [starting, setStarting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .get("/tests/continue")
        .then((res) => alive && setItem(res.data?.item || null))
        .catch(() => alive && setItem(null));
      return () => {
        alive = false;
      };
    }, [])
  );

  async function open(testId, isFree) {
    if (!isFree && !isSubscribed(user)) {
      AppAlert.alert("Premium test", "Upgrade to unlock every practice test.", [
        { text: "Later", style: "cancel" },
        { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
      ]);
      return;
    }
    setStarting(true);
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
      setStarting(false);
    }
  }

  if (item === undefined) {
    return (
      <View style={[styles.card, styles.loading]}>
        <ActivityIndicator size="small" color={colors.brand} />
      </View>
    );
  }

  // Not practised yet
  if (!item) {
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => navigation.navigate("PracticeTab")}>
        <View style={[styles.icon, { backgroundColor: colors.brandLight }]}>
          <Ionicons name="rocket" size={18} color={colors.brand} />
        </View>
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            Start practising
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            Easy to Advanced, 20 Qs each
          </Text>
        </View>
        <View style={[styles.button, { backgroundColor: colors.brand }]}>
          <Text style={styles.buttonText}>Begin</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // A test left half-way
  if (item.kind === "resume") {
    const pct = item.total ? Math.round((item.answered / item.total) * 100) : 0;
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.85} disabled={starting} onPress={() => open(item.testId, true)}>
        <View style={[styles.icon, { backgroundColor: "#FFF1E8" }]}>
          <Ionicons name="play" size={18} color="#EA580C" />
        </View>
        <View style={styles.body}>
          <Text style={styles.eyebrow}>LEFT HALF-WAY</Text>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.barRow}>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.max(pct, 4)}%` }]} />
            </View>
            <Text style={styles.barText}>
              {item.answered}/{item.total}
            </Text>
          </View>
        </View>
        <View style={[styles.button, { backgroundColor: "#EA580C" }]}>
          {starting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.buttonText}>Resume</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  // The next test of the series they practise
  const next = item.next;
  const good = item.lastAccuracy >= 60;
  return (
    <View style={styles.card}>
      <View style={[styles.icon, { backgroundColor: "#E6F7EC" }]}>
        <Ionicons name={next ? "arrow-forward" : "trophy"} size={18} color="#16A34A" />
      </View>
      <View style={styles.body}>
        <Text style={styles.eyebrow} numberOfLines={1}>
          {item.chapter.toUpperCase()} · {item.subject.toUpperCase()}
        </Text>
        <Text style={styles.title} numberOfLines={1}>
          {next ? `Next: ${shortTitle(next.title, item.chapter)}` : "Series complete 🎉"}
        </Text>
        <Text
          style={[styles.sub, { color: good ? colors.success : colors.warn }]}
          numberOfLines={1}
          onPress={() => navigation.navigate("Result", { attemptId: item.lastAttemptId })}
        >
          Last test {item.lastAccuracy}% · Review ›
        </Text>
      </View>
      {next ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: "#16A34A" }]}
          activeOpacity={0.85}
          disabled={starting}
          onPress={() => open(next.testId, next.isFree)}
          accessibilityRole="button"
        >
          {starting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {!next.isFree && !isSubscribed(user) && <Ionicons name="lock-closed" size={12} color="#FFFFFF" />}
              <Text style={styles.buttonText}>Start</Text>
            </>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.button, styles.buttonGhost]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("PracticeMode", { subject: item.subject, chapter: item.chapter })}
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: colors.brand }]}>More</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  loading: { justifyContent: "center", minHeight: 64 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.6, color: colors.slate },
  title: { fontSize: 14.5, fontWeight: "800", color: colors.ink, marginTop: 1 },
  sub: { fontSize: 12, fontWeight: "700", color: colors.slate, marginTop: 2 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 5 },
  bar: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.slateLight, overflow: "hidden" },
  barFill: { height: 5, borderRadius: 3, backgroundColor: "#EA580C" },
  barText: { fontSize: 11, fontWeight: "800", color: colors.slate },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 76,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 11,
  },
  buttonGhost: { backgroundColor: colors.brandTint, borderWidth: 1, borderColor: colors.brandLight },
  buttonText: { fontSize: 13, fontWeight: "800", color: "#FFFFFF" },
});
