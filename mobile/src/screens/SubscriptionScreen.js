import { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

const MRP = 999; // shown struck-through so the discount is visible

const PLANS = [
  {
    id: "quarterly",
    label: "Quarterly",
    duration: "3 mahine",
    price: 149,
    perMonth: "≈ ₹50/month",
    features: ["Unlimited mock tests", "Full PYQ access", "Chapter-wise adaptive practice", "Detailed analysis"],
  },
  {
    id: "yearly",
    label: "Yearly",
    duration: "12 mahine",
    price: 249,
    perMonth: "≈ ₹21/month",
    badge: "BEST VALUE",
    features: [
      "Unlimited everything",
      "All years PYQ + trend analysis",
      "All live exams",
      "Chapter-wise adaptive practice",
      "Future exams bhi included",
    ],
  },
];

export default function SubscriptionScreen({ navigation }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);

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

  const isActive = user?.subscriptionStatus === "active";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
      <View style={styles.header}>
        <View style={styles.crownWrap}>
          <Ionicons name="star" size={24} color="#B45309" />
        </View>
        <Text style={styles.title}>{isActive ? "Aap Premium ho ⭐" : "Premium Unlock Karo"}</Text>
        <Text style={styles.subtitle}>
          {isActive
            ? "Sab kuch unlocked hai. Practice jaari rakho!"
            : "Unlimited practice, poori PYQ library, aur detailed analysis"}
        </Text>
      </View>

      {credits > 0 && (
        <View style={styles.creditBanner}>
          <Ionicons name="gift" size={18} color={colors.success} />
          <Text style={styles.creditText}>
            Aapke paas <Text style={styles.creditAmount}>₹{credits}</Text> referral credit hai — checkout pe discount
            milega!
          </Text>
        </View>
      )}

      {PLANS.map((plan) => {
        const isBest = !!plan.badge;
        return (
          <View key={plan.id} style={[styles.planCard, isBest && styles.planCardBest]}>
            {plan.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{plan.badge}</Text>
              </View>
            )}

            <View style={styles.planTop}>
              <View>
                <Text style={styles.planLabel}>{plan.label}</Text>
                <Text style={styles.planDuration}>{plan.duration}</Text>
              </View>
              <View style={styles.priceWrap}>
                <Text style={styles.mrp}>₹{MRP}</Text>
                <Text style={[styles.price, isBest && styles.priceBest]}>₹{plan.price}</Text>
                <Text style={styles.perMonth}>{plan.perMonth}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.featureList}>
              {plan.features.map((f, idx) => (
                <View key={idx} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.success} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.buyButton, isBest && styles.buyButtonBest]}
              activeOpacity={0.85}
              onPress={() =>
                navigation.navigate("Payment", { plan: plan.id, amount: plan.price, label: plan.label, credits })
              }
            >
              <Text style={[styles.buyButtonText, isBest && styles.buyButtonTextBest]}>
                {isActive ? "Renew Karo" : "Abhi Kharido"}
              </Text>
              <Ionicons name="arrow-forward" size={16} color={isBest ? "#fff" : colors.brand} />
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={styles.referralCard} onPress={() => navigation.navigate("Referral")} activeOpacity={0.7}>
        <View style={styles.referralIcon}>
          <Ionicons name="gift" size={18} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.referralTitle}>Refer karke discount kamao</Text>
          <Text style={styles.referralSub}>Dost join kare, aapko ₹30-₹50 credit milega</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate} />
      </TouchableOpacity>

      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.slate} />
          <Text style={styles.trustText}>Secure payment</Text>
        </View>
        <View style={styles.trustItem}>
          <Ionicons name="card-outline" size={15} color={colors.slate} />
          <Text style={styles.trustText}>UPI · Card · Wallet</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },

  header: { alignItems: "center", marginTop: spacing.sm, marginBottom: spacing.lg },
  crownWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: "#FFFBEB",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 21, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 4, textAlign: "center", paddingHorizontal: spacing.lg },

  creditBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.successLight,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  creditText: { flex: 1, fontSize: 12, color: "#065F46", lineHeight: 17 },
  creditAmount: { fontWeight: "800" },

  planCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planCardBest: { borderColor: colors.brand, borderWidth: 2 },
  badge: {
    position: "absolute",
    top: -1,
    right: spacing.lg,
    backgroundColor: colors.brand,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: radius.sm,
    borderBottomRightRadius: radius.sm,
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 0.5 },

  planTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  planLabel: { fontSize: 17, fontWeight: "800", color: colors.ink },
  planDuration: { fontSize: 12, color: colors.slate, marginTop: 2 },
  priceWrap: { alignItems: "flex-end" },
  mrp: { fontSize: 12, color: colors.slate, textDecorationLine: "line-through" },
  price: { fontSize: 28, fontWeight: "800", color: colors.ink, lineHeight: 33 },
  priceBest: { color: colors.brand },
  perMonth: { fontSize: 11, color: colors.slate },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  featureList: { gap: 8, marginBottom: spacing.md },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  featureText: { flex: 1, fontSize: 13, color: colors.ink },

  buyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
  },
  buyButtonBest: { backgroundColor: colors.brand },
  buyButtonText: { fontSize: 15, fontWeight: "700", color: colors.brand },
  buyButtonTextBest: { color: "#fff" },

  referralCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  referralIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
  },
  referralTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  referralSub: { fontSize: 12, color: colors.slate, marginTop: 1 },

  trustRow: { flexDirection: "row", justifyContent: "center", gap: spacing.lg },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  trustText: { fontSize: 11, color: colors.slate },
});