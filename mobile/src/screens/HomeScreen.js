import { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const [loadingTest, setLoadingTest] = useState(false);
  const [todayTest, setTodayTest] = useState(null);
  const [upcomingLive, setUpcomingLive] = useState(null);
  const [stats, setStats] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [liveRes, attemptsRes, todayRes] = await Promise.allSettled([
        api.get("/exams/live/upcoming"),
        api.get("/tests/my-attempts"),
        api.get("/tests/today"),
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

      if (todayRes.status === "fulfilled") {
        setTodayTest(todayRes.value.data.test || null);
      }
    } catch (err) {
      // Non-critical - dashboard still usable
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
      let test = todayTest;
      if (!test?._id) {
        const res = await api.get("/tests/today");
        test = res.data.test;
      }
      navigation.navigate("TestTaking", { testId: test._id });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        Alert.alert("Free Trial Ended", err.response.data.message, [
          { text: "Maybe Later", style: "cancel" },
          { text: "Upgrade Now", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Unable to load the test right now");
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
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brand} />
      }
    >
      {/* ---- Header: avatar left, clean bar ---- */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.navigate("Profile")} activeOpacity={0.7}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
          </View>
          <View>
            <Text style={styles.greetingSmall}>{greeting},</Text>
            <Text style={styles.greetingName}>{user?.name?.split(" ")[0] || "Aspirant"}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.streakPill}>
          <Ionicons name="flame" size={14} color="#EA580C" />
          <Text style={styles.streakText}>{user?.streakCount || 0} days</Text>
        </View>
      </View>

      {/* ---- Hero: Today's Test — the ONE action we want them to take ---- */}
      <TouchableOpacity onPress={startTodayTest} disabled={loadingTest} activeOpacity={0.92}>
        <View style={styles.heroCard}>
          {/* Decorative layered blobs for depth */}
          <View style={styles.heroBlobLarge} />
          <View style={styles.heroBlobSmall} />

          {/* Glossy sheen overlay */}
          <LinearGradient
            colors={["rgba(255,255,255,0.22)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 0.9 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Watermark icon */}
          <Ionicons
            name="book"
            size={130}
            color="rgba(255,255,255,0.10)"
            style={styles.heroWatermark}
          />

          {loadingTest ? (
            <View style={styles.heroLoading}>
              <ActivityIndicator color="#fff" size="large" />
              <Text style={styles.heroLoadingText}>Preparing your test…</Text>
            </View>
          ) : (
            <>
              <View style={styles.heroTopRow}>
                <View style={styles.heroBadge}>
                  <Ionicons name="flash" size={12} color="#fff" />
                  <Text style={styles.heroBadgeText}>TODAY'S TEST</Text>
                </View>
                {user?.streakCount > 0 && (
                  <View style={styles.heroStreakChip}>
                    <Ionicons name="flame" size={12} color="#fff" />
                    <Text style={styles.heroStreakText}>{user.streakCount}</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroTitle} numberOfLines={2}>
                {todayTest?.title || "Daily practice,\ndaily progress"}
              </Text>
              <Text style={styles.heroSub} numberOfLines={1}>
                {todayTest
                  ? "Personalized for your weak topics"
                  : "Your custom test will be ready in a moment"}
              </Text>

              {/* Meta chips — only show what's actually available */}
              {(todayTest?.questionCount || todayTest?.duration) && (
                <View style={styles.heroMetaRow}>
                  {!!todayTest?.questionCount && (
                    <View style={styles.heroMetaChip}>
                      <Ionicons name="help-circle-outline" size={13} color="#fff" />
                      <Text style={styles.heroMetaText}>{todayTest.questionCount} Qs</Text>
                    </View>
                  )}
                  {!!todayTest?.duration && (
                    <View style={styles.heroMetaChip}>
                      <Ionicons name="time-outline" size={13} color="#fff" />
                      <Text style={styles.heroMetaText}>{todayTest.duration} min</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Start Now</Text>
                <View style={styles.heroButtonIcon}>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
              </View>
            </>
          )}
        </View>
      </TouchableOpacity>

      {/* ---- Stats row ---- */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="checkmark-done" size={16} color={colors.brand} />
          </View>
          <Text style={styles.statValue}>{stats?.totalTests ?? "—"}</Text>
          <Text style={styles.statLabel}>Tests Taken</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#DCFCE7" }]}>
            <Ionicons name="trending-up" size={16} color={colors.success} />
          </View>
          <Text style={styles.statValue}>{stats ? `${stats.avgAccuracy}%` : "—"}</Text>
          <Text style={styles.statLabel}>Average Score</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrap, { backgroundColor: "#FFEDD5" }]}>
            <Ionicons name="flame" size={16} color="#EA580C" />
          </View>
          <Text style={styles.statValue}>{user?.streakCount || 0}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
      </View>

      {/* ---- Live exam (only if one exists) ---- */}
      {upcomingLive && (
        <TouchableOpacity
          style={styles.liveCard}
          onPress={() => navigation.navigate("LiveTab")}
          activeOpacity={0.9}
        >
          <View style={styles.liveTop}>
            <View style={styles.liveDotOuter}>
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.liveLabel}>LIVE EXAM</Text>
            <View style={{ flex: 1 }} />
            <Ionicons name="chevron-forward" size={16} color={colors.slate} />
          </View>
          <Text style={styles.liveTitle} numberOfLines={1}>
            {upcomingLive.title}
          </Text>
          <View style={styles.liveMeta}>
            <Ionicons name="time-outline" size={13} color={colors.slate} />
            <Text style={styles.liveMetaText}>
              {new Date(upcomingLive.scheduledAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* ---- Upgrade banner (only for free users) ---- */}
      {!isPremium && (
        <TouchableOpacity style={styles.upgradeCard} onPress={() => navigation.navigate("Subscription")} activeOpacity={0.9}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="star" size={18} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>Unlock everything with Premium</Text>
            <Text style={styles.upgradeSub}>Unlimited mocks & practice · starting ₹149</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B45309" />
        </TouchableOpacity>
      )}

      {/* ---- Quick access ---- */}
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.grid}>
        <QuickCard icon="stats-chart" label="My Analysis" tint="#EEF2FF" iconColor="#4338CA" onPress={() => navigation.navigate("Analysis")} />
        <QuickCard icon="time" label="History" tint="#F0FDFA" iconColor="#0F766E" onPress={() => navigation.navigate("HistoryTab")} />
        <QuickCard icon="gift" label="Refer & Earn" tint="#FDF2F8" iconColor="#BE185D" onPress={() => navigation.navigate("Referral")} />
        <QuickCard
          icon={isPremium ? "shield-checkmark" : "star"}
          label={isPremium ? "Premium" : "Upgrade"}
          tint="#FFFBEB"
          iconColor="#B45309"
          onPress={() => navigation.navigate("Subscription")}
        />
      </View>
    </ScrollView>
  );
}

function QuickCard({ icon, label, onPress, tint, iconColor }) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickIconWrap, tint ? { backgroundColor: tint } : null]}>
        <Ionicons name={icon} size={20} color={iconColor || colors.brand} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
  },
  android: { elevation: 2 },
});

const heroShadow = Platform.select({
  ios: {
    shadowColor: colors.brand,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
  },
  android: { elevation: 7 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight, paddingHorizontal: spacing.lg },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: spacing.lg,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  greetingSmall: { fontSize: 12, color: colors.slate },
  greetingName: { fontSize: 17, fontWeight: "800", color: colors.ink },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "#FED7AA",
  },
  streakText: { fontSize: 12, fontWeight: "700", color: "#EA580C" },

  // Hero — "Today's Test"
  heroCard: {
    backgroundColor: colors.brand,
    borderRadius: 28,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 200,
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    ...heroShadow,
  },
  heroBlobLarge: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  heroBlobSmall: {
    position: "absolute",
    bottom: -55,
    left: -35,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroWatermark: {
    position: "absolute",
    right: -10,
    bottom: -18,
    transform: [{ rotate: "-12deg" }],
  },
  heroLoading: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.md },
  heroLoadingText: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: spacing.sm, fontWeight: "600" },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  heroStreakChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroStreakText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 29 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 6 },
  heroMetaRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  heroMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  heroMetaText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: spacing.md,
    gap: 10,
  },
  heroButtonText: { color: colors.brand, fontSize: 14, fontWeight: "800" },
  heroButtonIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats
  statsRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink },
  statLabel: { fontSize: 10, color: colors.slate, marginTop: 2 },

  // Live
  liveCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 3,
    borderLeftColor: colors.danger,
    ...cardShadow,
  },
  liveTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  liveDotOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(220,38,38,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.danger },
  liveLabel: { fontSize: 10, fontWeight: "800", color: colors.danger, letterSpacing: 0.5 },
  liveTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  liveMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  liveMetaText: { fontSize: 12, color: colors.slate },

  // Upgrade
  upgradeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#FFFBEB",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: "#FDE68A",
    ...cardShadow,
  },
  upgradeIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeTitle: { fontSize: 14, fontWeight: "700", color: "#92400E" },
  upgradeSub: { fontSize: 12, color: "#B45309", marginTop: 1 },

  // Quick access
  sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink, marginBottom: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  quickCard: {
    width: "47.5%",
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  quickIconWrap: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  quickLabel: { fontSize: 13, fontWeight: "700", color: colors.ink },
});