import { useCallback, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

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
      Alert.alert("Error", "Share nahi ho paya");
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
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
      {/* Hero */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="gift" size={26} color="#fff" />
        </View>
        <Text style={styles.heroTitle}>Refer karo, discount kamao</Text>
        <Text style={styles.heroSub}>
          Dost aapke code se join karke plan le, aapko ₹30-₹50 credit milega — agli purchase pe discount
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="wallet" size={18} color={colors.success} />
          <Text style={[styles.statValue, { color: colors.success }]}>₹{info.credits || 0}</Text>
          <Text style={styles.statLabel}>Credit Balance</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="people" size={18} color={colors.brand} />
          <Text style={styles.statValue}>{info.referralCount || 0}</Text>
          <Text style={styles.statLabel}>Successful Referrals</Text>
        </View>
      </View>

      {/* Code */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>AAPKA REFERRAL CODE</Text>
        <Text style={styles.codeText}>{info.referralCode}</Text>
        <TouchableOpacity style={styles.shareButton} onPress={shareCode} activeOpacity={0.85}>
          <Ionicons name="share-social" size={17} color="#fff" />
          <Text style={styles.shareButtonText}>Code Share Karo</Text>
        </TouchableOpacity>
      </View>

      {/* How it works */}
      <Text style={styles.sectionTitle}>Kaise Kaam Karta Hai</Text>
      <View style={styles.stepsCard}>
        <Step
          num="1"
          icon="share-social-outline"
          title="Code share karo"
          desc="Dost ko apna referral code bhejo (WhatsApp, Telegram — kahin bhi)"
        />
        <View style={styles.stepLine} />
        <Step
          num="2"
          icon="person-add-outline"
          title="Dost signup kare"
          desc="Wo signup karte waqt aapka code daale"
        />
        <View style={styles.stepLine} />
        <Step
          num="3"
          icon="wallet-outline"
          title="Aapko credit mile"
          desc="Jab wo pehla plan kharide — ₹30 (quarterly) ya ₹50 (yearly) aapko"
        />
      </View>

      {info.credits > 0 && (
        <TouchableOpacity style={styles.useCreditCard} onPress={() => navigation.navigate("Subscription")} activeOpacity={0.7}>
          <Ionicons name="pricetag" size={18} color={colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={styles.useCreditTitle}>₹{info.credits} credit use karo</Text>
            <Text style={styles.useCreditSub}>Checkout pe discount ban ke lagega</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.success} />
        </TouchableOpacity>
      )}

      <Text style={styles.note}>
        Credit max 50% tak discount de sakta hai. Referral tabhi count hoga jab aapka dost pehli baar paid plan
        kharide.
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
  container: { flex: 1, backgroundColor: colors.slateLight },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.slateLight },

  hero: {
    backgroundColor: colors.brand,
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroTitle: { fontSize: 19, fontWeight: "800", color: "#fff", textAlign: "center" },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },

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
  statValue: { fontSize: 22, fontWeight: "800", color: colors.ink, marginTop: 5 },
  statLabel: { fontSize: 11, color: colors.slate, marginTop: 2 },

  codeCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  codeLabel: { fontSize: 10, fontWeight: "800", color: colors.slate, letterSpacing: 1 },
  codeText: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 3,
    marginVertical: spacing.sm,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.brand,
    height: 48,
    borderRadius: radius.md,
    width: "100%",
    marginTop: spacing.sm,
  },
  shareButtonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  sectionTitle: { fontSize: 16, fontWeight: "800", color: colors.ink, marginBottom: spacing.sm },
  stepsCard: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  step: { flexDirection: "row", gap: spacing.sm },
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
  stepTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  stepDesc: { fontSize: 12, color: colors.slate, marginTop: 2, lineHeight: 17 },
  stepLine: { width: 1, height: 14, backgroundColor: colors.border, marginLeft: 13, marginVertical: 6 },

  useCreditCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginBottom: spacing.md,
  },
  useCreditTitle: { fontSize: 14, fontWeight: "700", color: "#065F46" },
  useCreditSub: { fontSize: 12, color: "#047857", marginTop: 1 },

  note: { fontSize: 11, color: colors.slate, textAlign: "center", lineHeight: 16, paddingHorizontal: spacing.md },
});