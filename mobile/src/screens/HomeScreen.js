import { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

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
      const res = await api.get("/tests/today");
      navigation.navigate("TestTaking", { testId: res.data.test._id });
    } catch (err) {
      if (err.response?.data?.code === "SUBSCRIPTION_REQUIRED") {
        Alert.alert("Free Trial Khatam", err.response.data.message, [
          { text: "Baad mein", style: "cancel" },
          { text: "Upgrade Karo", onPress: () => navigation.navigate("Subscription") },
        ]);
      } else {
        Alert.alert("Error", err.response?.data?.message || "Test load nahi ho paya");
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
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ---- Header: avatar left, notification-free clean bar ---- */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerLeft} onPress={() => navigation.navigate("Profile")}>
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
          <Text style={styles.streakText}>{user?.streakCount || 0} din</Text>
        </View>
      </View>

      {/* ---- Hero: the ONE action we want them to take ---- */}
      <TouchableOpacity style={styles.heroCard} onPress={startTodayTest} disabled={loadingTest} activeOpacity={0.9}>
        {loadingTest ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeText}>AAJ KA TEST</Text>
            </View>
            <Text style={styles.heroTitle}>Roz ka practice,{"\n"}roz ka sudhaar</Text>
            <Text style={styles.heroSub}>Aapke weak topics ke hisaab se banaya gaya</Text>
            <View style={styles.heroButton}>
              <Text style={styles.heroButtonText}>Shuru Karo</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.brand} />
            </View>
          </>
        )}
      </TouchableOpacity>

      {/* ---- Stats row ---- */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="checkmark-done" size={18} color={colors.brand} />
          <Text style={styles.statValue}>{stats?.totalTests ?? "—"}</Text>
          <Text style={styles.statLabel}>Tests Diye</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trending-up" size={18} color={colors.success} />
          <Text style={styles.statValue}>{stats ? `${stats.avgAccuracy}%` : "—"}</Text>
          <Text style={styles.statLabel}>Average Score</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="flame" size={18} color="#EA580C" />
          <Text style={styles.statValue}>{user?.streakCount || 0}</Text>
          <Text style={styles.statLabel}>Din Streak</Text>
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
            <View style={styles.liveDot} />
            <Text style={styles.liveLabel}>LIVE EXAM</Text>
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
        <TouchableOpacity style={styles.upgradeCard} onPress={() => navigation.navigate("Subscription")}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="star" size={18} color="#B45309" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.upgradeTitle}>Premium se sab unlock karo</Text>
            <Text style={styles.upgradeSub}>Unlimited mocks & practice · ₹149 se</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#B45309" />
        </TouchableOpacity>
      )}

      {/* ---- Quick access ---- */}
      <Text style={styles.sectionTitle}>Quick Access</Text>
      <View style={styles.grid}>
        <QuickCard icon="stats-chart" label="My Analysis" onPress={() => navigation.navigate("Analysis")} />
        <QuickCard icon="time" label="History" onPress={() => navigation.navigate("HistoryTab")} />
        <QuickCard icon="gift" label="Refer & Earn" onPress={() => navigation.navigate("Referral")} />
        <QuickCard
          icon={isPremium ? "shield-checkmark" : "star"}
          label={isPremium ? "Premium" : "Upgrade"}
          onPress={() => navigation.navigate("Subscription")}
        />
      </View>
    </ScrollView>
  );
}

function QuickCard({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.quickCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.quickIconWrap}>
        <Ionicons name={icon} size={20} color={colors.brand} />
      </View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#fff", fontSize: 18, fontWeight: "800" },
  greetingSmall: { fontSize: 12, color: colors.slate },
  greetingName: { fontSize: 17, fontWeight: "800", color: colors.ink },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  streakText: { fontSize: 12, fontWeight: "700", color: "#EA580C" },

  // Hero
  heroCard: {
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    minHeight: 170,
    justifyContent: "center",
  },
  heroBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginBottom: spacing.sm,
  },
  heroBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800", letterSpacing: 0.6 },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "800", lineHeight: 29 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 6, marginBottom: spacing.md },
  heroButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radius.full,
  },
  heroButtonText: { color: colors.brand, fontSize: 14, fontWeight: "700" },

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
  },
  statValue: { fontSize: 18, fontWeight: "800", color: colors.ink, marginTop: 6 },
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
  },
  liveTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
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
  },
  upgradeIcon: {
    width: 36,
    height: 36,
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