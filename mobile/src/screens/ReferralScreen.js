import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

export default function ReferralScreen({ navigation }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/payments/referral-info");
      setInfo(res.data);
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

  async function shareCode() {
    try {
      await Share.share({ message: info.shareMessage });
    } catch (err) {
      Alert.alert("Couldn't share", "Please try again");
    }
  }

  if (loading || !info) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient colors={gradients.success} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.ring} />
        <View style={styles.heroIcon}>
          <Ionicons name="gift" size={24} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Refer friends, pay less</Text>
        <Text style={styles.heroSub}>
          When a friend signs up with your code and buys a plan, you earn ₹30–₹50 credit
        </Text>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.successLight }]}>
            <Ionicons name="wallet" size={15} color={colors.success} />
          </View>
          <Text style={[styles.statValue, { color: colors.success }]}>₹{info.credits || 0}</Text>
          <Text style={styles.statLabel}>Credit balance</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.brandLight }]}>
            <Ionicons name="people" size={15} color={colors.brand} />
          </View>
          <Text style={styles.statValue}>{info.referralCount || 0}</Text>
          <Text style={styles.statLabel}>Referrals</Text>
        </View>
      </View>

      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
        <Text style={styles.codeText}>{info.referralCode}</Text>
        <TouchableOpacity onPress={shareCode} activeOpacity={0.85} style={{ width: "100%" }}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.shareButton}>
            <Ionicons name="share-social" size={17} color="#fff" />
            <Text style={styles.shareButtonText}>Share Code</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>How it works</Text>
      <View style={styles.stepsCard}>
        <Step num="1" icon="share-social-outline" title="Share your code" desc="Send it to friends on WhatsApp, Telegram — anywhere" />
        <View style={styles.stepLine} />
        <Step num="2" icon="person-add-outline" title="They sign up" desc="Your code goes in during their registration" />
        <View style={styles.stepLine} />
        <Step num="3" icon="wallet-outline" title="You earn credit" desc="₹30 (quarterly) or ₹50 (yearly) on their first purchase" />
      </View>

      {info.credits > 0 && (
        <TouchableOpacity style={styles.useCreditCard} onPress={() => navigation.navigate("Subscription")} activeOpacity={0.75}>
          <Ionicons name="pricetag" size={17} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.useCreditTitle}>Use your ₹{info.credits} credit</Text>
            <Text style={styles.useCreditSub}>Applied automatically at checkout</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.success} />
        </TouchableOpacity>
      )}

      <Text style={styles.note}>
        Credit can cover up to 50% of a plan. It's earned when your friend makes their first paid purchase.
      </Text>
    </ScrollView>
  );
}

function Step({ num, icon, title, desc }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{num}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.stepTitleRow}>
          <Ionicons name={icon} size={14} color={colors.brand} />
          <Text style={styles.stepTitle}>{title}</Text>
        </View>
        <Text style={styles.stepDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },

  hero: { borderRadius: radius.xxl, padding: spacing.lg, alignItems: "center", marginBottom: spacing.md, overflow: "hidden", ...shadow.md },
  ring: {
    position: "absolute",
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 24,
    borderColor: "rgba(255,255,255,0.08)",
    top: -70,
    right: -50,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center", letterSpacing: -0.3 },
  heroSub: { fontSize: 13, color: "rgba(255,255,255,0.88)", textAlign: "center", marginTop: 5, lineHeight: 19 },

  statsRow: { flexDirection: "row", gap: 10, marginBottom: spacing.md },
  statCard: { ...card, flex: 1, paddingVertical: spacing.md, alignItems: "center" },
  statIcon: { width: 32, height: 32, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 6 },
  statLabel: { ...type.tiny, color: colors.slateSoft, fontWeight: "600", marginTop: 1 },

  codeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  codeLabel: { ...type.micro, color: colors.slateSoft, letterSpacing: 1 },
  codeText: { fontSize: 32, fontWeight: "800", color: colors.brand, letterSpacing: 4, marginVertical: 12 },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: radius.md,
    ...shadow.brand,
  },
  shareButtonText: { color: "#fff", fontSize: 15, fontWeight: "800" },

  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: 12 },
  stepsCard: { ...card, padding: spacing.md, marginBottom: spacing.md },
  step: { flexDirection: "row", gap: 10 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontSize: 12, fontWeight: "800", color: colors.brand },
  stepTitleRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  stepTitle: { ...type.bodyStrong, color: colors.ink },
  stepDesc: { ...type.small, color: colors.slate, marginTop: 2, lineHeight: 18 },
  stepLine: { width: 1.5, height: 16, backgroundColor: colors.border, marginLeft: 13, marginVertical: 7 },

  useCreditCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
    marginBottom: spacing.md,
  },
  useCreditTitle: { ...type.bodyStrong, color: "#065F46" },
  useCreditSub: { ...type.tiny, color: "#047857", fontWeight: "500", marginTop: 1 },

  note: { ...type.tiny, color: colors.slateSoft, textAlign: "center", lineHeight: 17, paddingHorizontal: spacing.md, fontWeight: "500" },
});
