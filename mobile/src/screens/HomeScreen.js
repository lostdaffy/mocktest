import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from "react-native";
import AppAlert from "../components/AppAlert";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [loadingTest, setLoadingTest] = useState(false);
  const [upcomingLive, setUpcomingLive] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [liveRes, attemptsRes] = await Promise.allSettled([
        api.get("/exams/live/upcoming"),
        api.get("/tests/my-attempts"),
      ]);

      if (liveRes.status === "fulfilled") {
        setUpcomingLive(liveRes.value.data.exams?.[0] || null);
      }

      if (attemptsRes.status === "fulfilled") {
        const attempts = attemptsRes.value.data.attempts || [];
        const totalTests = attempts.length;
        const avgAccuracy =
          totalTests > 0
            ? Math.round(attempts.reduce((sum, a) => sum + (a.accuracy || 0), 0) / totalTests)
            : 0;
        setStats({ totalTests, avgAccuracy });
      }
    } catch (err) {
      // Dashboard stays usable without these
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  async function startTodayTest() {
    setLoadingTest(true);
    try {
      const res = await api.get("/tests/today");
      navigation.navigate("TestTaking", { testId: res.data.test._id });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        AppAlert.alert("Free trial used up", err.response.data.message, [
          { text: "Later", style: "cancel" },
          { text: "Upgrade", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else {
        AppAlert.alert("Something went wrong", err.response?.data?.message || "Couldn't load the test");
      }
    } finally {
      setLoadingTest(false);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  const isPremium = user?.subscriptionStatus === "active";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.navigate("Profile")} activeOpacity={0.7}>
          <LinearGradient colors={gradients.brand} style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
          </LinearGradient>
          <View>
            <Text style={styles.greetingSmall}>{greeting}</Text>
            <Text style={styles.greetingName}>{user?.name?.split(" ")[0] || "Aspirant"}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.streakPill}>
          <Ionicons name="flame" size={13} color="#EA580C" />
          <Text style={styles.streakText}>{user?.streakCount || 0}</Text>
        </View>
      </View>

      {/* ---------- TODAY'S TEST — the hero ---------- */}
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={gradients.hero}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Decorative rings — depth without an image asset */}
          <View style={styles.ring1} />
          <View style={styles.ring2} />

          {loadingTest ? (
            <View style={styles.heroLoading}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.heroLoadingText}>Preparing your test…</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroTop}>
                <View style={styles.heroBadge}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.heroBadgeText}>TODAY'S TEST</Text>
                </View>
                <Ionicons name="sparkles" size={17} color="rgba(255,255,255,0.55)" />
              </View>

              <Text style={styles.heroTitle}>Sharpen your{"\n"}weak areas</Text>
              <Text style={styles.heroSub}>
                Personalised from your last attempts — built to fix what's costing you marks.
              </Text>

              <View style={styles.heroFooter}>
                <TouchableOpacity style={styles.heroButton} onPress={startTodayTest} activeOpacity={0.85}>
                  <Text style={styles.heroButtonText}>Start Test</Text>
                  <View style={styles.heroButtonIcon}>
                    <Ionicons name="arrow-forward" size={13} color={colors.brand} />
                  </View>
                </TouchableOpacity>

                <View style={styles.heroMeta}>
                  <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.heroMetaText}>~15 min</Text>
                </View>
              </View>
            </>
          )}
        </LinearGradient>
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <View style={styles.statsRow}>
          <StatCard icon="checkmark-done" tint={colors.brand} bg={colors.brandLight} value={stats?.totalTests ?? "—"} label="Tests taken" />
          <StatCard icon="trending-up" tint={colors.success} bg={colors.successLight} value={stats ? `${stats.avgAccuracy}%` : "—"} label="Avg. score" />
          <StatCard icon="flame" tint="#EA580C" bg="#FFF7ED" value={user?.streakCount || 0} label="Day streak" />
        </View>
      </View>

      {/* Live exam */}
      {upcomingLive && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.liveCard} onPress={() => navigation.navigate("LiveTab")} activeOpacity={0.8}>
            <LinearGradient colors={gradients.danger} style={styles.liveIcon}>
              <Ionicons name="radio" size={18} color="#fff" />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <View style={styles.liveTop}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE EXAM</Text>
              </View>
              <Text style={styles.liveTitle} numberOfLines={1}>{upcomingLive.title}</Text>
              <Text style={styles.liveTime}>
                {new Date(upcomingLive.scheduledAt).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.slateSoft} />
          </TouchableOpacity>
        </View>
      )}

      {/* Upgrade */}
      {!isPremium && (
        <View style={styles.section}>
          <TouchableOpacity onPress={() => navigation.navigate("Subscription")} activeOpacity={0.85}>
            <LinearGradient
              colors={gradients.premium}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeCard}
            >
              <View style={styles.upgradeIcon}>
                <Ionicons name="star" size={17} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.upgradeTitle}>Unlock everything</Text>
                <Text style={styles.upgradeSub}>Unlimited mocks & practice · from ₹149</Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={24} color="rgba(255,255,255,0.9)" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Quick access */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick access</Text>
        <View style={styles.grid}>
          <QuickCard icon="stats-chart" tint={colors.brand} bg={colors.brandLight} label="My Analysis" sub="Topic breakdown" onPress={() => navigation.navigate("Analysis")} />
          <QuickCard icon="time" tint={colors.slate} bg={colors.slateLight} label="History" sub="Past attempts" onPress={() => navigation.navigate("HistoryTab")} />
          <QuickCard icon="gift" tint={colors.success} bg={colors.successLight} label="Refer & Earn" sub="Get credits" onPress={() => navigation.navigate("Referral")} />
          <QuickCard
            icon={isPremium ? "shield-checkmark" : "star"}
            tint={colors.warn}
            bg={colors.warnLight}
            label={isPremium ? "Premium" : "Upgrade"}
            sub={isPremium ? "Active" : "From ₹149"}
            onPress={() => navigation.navigate("Subscription")}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function StatCard({ icon, tint, bg, value, label }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={15} color={tint} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function QuickCard({ icon, tint, bg, label, sub, onPress }) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.quickIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
      <Text style={styles.quickSub}>{sub}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: 18,
    paddingBottom: spacing.md,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...shadow.brand },
  avatarText: { color: "#fff", fontSize: 17, fontWeight: "800" },
  greetingSmall: { ...type.small, color: colors.slate },
  greetingName: { ...type.h3, color: colors.ink, marginTop: 1 },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  streakText: { ...type.bodyStrong, color: "#EA580C" },

  // Hero
  heroWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  hero: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    minHeight: 196,
    justifyContent: "center",
    overflow: "hidden",
    ...shadow.brand,
  },
  ring1: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 26,
    borderColor: "rgba(255,255,255,0.05)",
    top: -70,
    right: -50,
  },
  ring2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 20,
    borderColor: "rgba(255,255,255,0.04)",
    bottom: -50,
    right: 40,
  },
  heroLoading: { alignItems: "center", gap: 10 },
  heroLoadingText: { color: "rgba(255,255,255,0.85)", ...type.small },

  heroTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#7DD3FC" },
  heroBadgeText: { color: "#fff", ...type.micro },

  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800", lineHeight: 32, letterSpacing: -0.5 },
  heroSub: { color: "rgba(255,255,255,0.78)", fontSize: 13, lineHeight: 19, marginTop: 7, maxWidth: "92%" },

  heroFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.md },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  heroButtonText: { color: colors.brand, fontSize: 14, fontWeight: "800" },
  heroButtonIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  heroMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroMetaText: { color: "rgba(255,255,255,0.75)", ...type.tiny },

  // Stats
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: { ...card, flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 7 },
  statLabel: { ...type.micro, color: colors.slateSoft, fontWeight: "600", letterSpacing: 0, marginTop: 2 },

  // Live
  liveCard: { ...card, flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md },
  liveIcon: { width: 42, height: 42, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  liveTop: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  liveLabel: { ...type.micro, color: colors.danger },
  liveTitle: { ...type.bodyStrong, color: colors.ink },
  liveTime: { ...type.tiny, color: colors.slate, fontWeight: "500", marginTop: 2 },

  // Upgrade
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: radius.lg,
    padding: spacing.md,
    ...shadow.md,
  },
  upgradeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeTitle: { ...type.bodyStrong, color: "#fff", fontSize: 15 },
  upgradeSub: { fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 1 },

  // Quick access
  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  quickCard: { ...card, width: "47.6%", padding: spacing.md },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickLabel: { ...type.bodyStrong, color: colors.ink },
  quickSub: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 2 },
});