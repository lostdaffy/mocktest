import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { isSubscribed } from "../utils/subscription";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

const BENEFITS = [
  "Unlimited access to all mock tests",
  "Full previous-year question library",
  "Chapter-wise practice — easy to advanced",
  "Live exams with all-India ranking",
  "Detailed analysis of every attempt",
  "Cancel anytime",
];

const PLANS = [
  {
    id: "half_yearly",
    label: "6 Months",
    price: 149,
    mrp: 299,
    perDay: "₹0.82/day",
    off: "50% OFF",
  },
  {
    id: "yearly",
    label: "12 Months",
    price: 249,
    mrp: 999,
    perDay: "₹0.68/day",
    off: "75% OFF",
    best: true,
  },
];

export default function SubscriptionScreen({ navigation }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);
  const [selected, setSelected] = useState("yearly");

  const loadCredits = useCallback(async () => {
    try {
      const res = await api.get("/payments/referral-info");
      setCredits(res.data.credits || 0);
    } catch (err) {
      // non-critical
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCredits();
    }, [loadCredits])
  );

  const isActive = isSubscribed(user);
  const plan = PLANS.find((p) => p.id === selected);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient colors={gradients.premium} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.ring} />
          <View style={styles.crownWrap}>
            <Ionicons name="star" size={22} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>
            {isActive ? "You're Premium" : "Unlock your full potential"}
          </Text>
          <Text style={styles.headerSub}>
            {isActive
              ? "Everything is unlocked. Keep practising."
              : "Every mock, every PYQ, every practice test — no limits."}
          </Text>
        </LinearGradient>

        {credits > 0 && (
          <View style={styles.creditBanner}>
            <Ionicons name="gift" size={17} color={colors.success} />
            <Text style={styles.creditText}>
              You have <Text style={styles.creditAmount}>₹{credits}</Text> in referral credit — it'll apply at checkout
            </Text>
          </View>
        )}

        {/* Benefits */}
        <Text style={styles.sectionTitle}>What you get</Text>
        <View style={styles.benefitsCard}>
          {BENEFITS.map((b, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <View style={styles.checkWrap}>
                <Ionicons name="checkmark" size={11} color={colors.success} />
              </View>
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <Text style={styles.sectionTitle}>Choose a plan</Text>
        {PLANS.map((p) => {
          const active = selected === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.planRow, active && styles.planRowActive]}
              onPress={() => setSelected(p.id)}
              activeOpacity={0.8}
            >
              {p.best && (
                <View style={styles.bestBadge}>
                  <Text style={styles.bestBadgeText}>BEST VALUE</Text>
                </View>
              )}

              <View style={[styles.radio, active && styles.radioActive]}>
                {active && <View style={styles.radioDot} />}
              </View>

              <View style={{ flex: 1 }}>
                <View style={styles.planLabelRow}>
                  <Text style={[styles.planLabel, active && styles.planLabelActive]}>{p.label}</Text>
                  <View style={styles.offTag}>
                    <Text style={styles.offText}>{p.off}</Text>
                  </View>
                </View>
                <Text style={styles.perDay}>equivalent to {p.perDay}</Text>
              </View>

              <View style={styles.priceWrap}>
                <Text style={styles.mrp}>₹{p.mrp}</Text>
                <Text style={[styles.price, active && styles.priceActive]}>₹{p.price}</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Referral link */}
        <TouchableOpacity style={styles.referralCard} onPress={() => navigation.navigate("Referral")} activeOpacity={0.75}>
          <View style={styles.referralIcon}>
            <Ionicons name="gift" size={17} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.referralTitle}>Refer friends, pay less</Text>
            <Text style={styles.referralSub}>Earn ₹30–₹50 credit per referral</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.slateSoft} />
        </TouchableOpacity>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Ionicons name="shield-checkmark-outline" size={14} color={colors.slateSoft} />
            <Text style={styles.trustText}>Secure payment</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="card-outline" size={14} color={colors.slateSoft} />
            <Text style={styles.trustText}>UPI · Card · Wallet</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA — always reachable */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerAmount}>₹{plan.price}</Text>
          <Text style={styles.footerLabel}>for {plan.label.toLowerCase()}</Text>
        </View>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("Payment", { plan: plan.id, amount: plan.price, label: plan.label, credits })
          }
        >
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.buyButton}>
            <Text style={styles.buyButtonText}>{isActive ? "Renew Now" : "Buy Now"}</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  header: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow.md,
  },
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
  crownWrap: {
    width: 50,
    height: 50,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff", textAlign: "center", letterSpacing: -0.3 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.88)", textAlign: "center", marginTop: 5, lineHeight: 19 },

  creditBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.successBorder,
  },
  creditText: { flex: 1, ...type.small, color: "#065F46", lineHeight: 18 },
  creditAmount: { fontWeight: "800" },

  sectionTitle: { ...type.h3, color: colors.ink, marginBottom: 12, marginTop: 6 },

  benefitsCard: { ...card, padding: spacing.md, gap: 11, marginBottom: spacing.md },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  checkWrap: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { flex: 1, ...type.body, color: colors.inkSoft },

  planRow: {
    ...card,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    marginBottom: 10,
  },
  planRowActive: { borderColor: colors.brand, borderWidth: 2, backgroundColor: colors.brandTint },
  bestBadge: {
    position: "absolute",
    top: -8,
    right: 14,
    backgroundColor: colors.brand,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  bestBadgeText: { fontSize: 8, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },

  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand },

  planLabelRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  planLabel: { ...type.h3, color: colors.ink },
  planLabelActive: { color: colors.brand },
  offTag: { backgroundColor: colors.dangerLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.xs },
  offText: { fontSize: 9, fontWeight: "800", color: colors.danger },
  perDay: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 3 },

  priceWrap: { alignItems: "flex-end" },
  mrp: { fontSize: 11, color: colors.slateSoft, textDecorationLine: "line-through" },
  price: { fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: 1 },
  priceActive: { color: colors.brand },

  referralCard: { ...card, flexDirection: "row", alignItems: "center", gap: 11, padding: spacing.md, marginTop: 6, marginBottom: spacing.md },
  referralIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  referralTitle: { ...type.bodyStrong, color: colors.ink },
  referralSub: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 1 },

  trustRow: { flexDirection: "row", justifyContent: "center", gap: spacing.lg },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadow.lg,
  },
  footerPrice: { minWidth: 74 },
  footerAmount: { fontSize: 21, fontWeight: "800", color: colors.ink },
  footerLabel: { ...type.tiny, color: colors.slateSoft, fontWeight: "500" },
  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 52,
    borderRadius: radius.md,
    ...shadow.brand,
  },
  buyButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});