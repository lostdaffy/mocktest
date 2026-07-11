import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser } = useAuth();
  const [savingLang, setSavingLang] = useState(false);
  const [email, setEmail] = useState(user?.email || "");
  const [savingEmail, setSavingEmail] = useState(false);

  async function saveEmail() {
    if (!email || email === user?.email) return;
    setSavingEmail(true);
    try {
      await api.patch("/auth/profile", { email });
      await refreshUser();
      Alert.alert("Saved", "Email save ho gaya");
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Email save nahi hua");
    } finally {
      setSavingEmail(false);
    }
  }

  async function changeLanguage(lang) {
    if (user.preferredLanguage === lang) return;
    setSavingLang(true);
    try {
      await api.patch("/auth/profile", { preferredLanguage: lang });
      await refreshUser();
    } catch (err) {
      Alert.alert("Error", "Language update nahi ho paya");
    } finally {
      setSavingLang(false);
    }
  }

  function confirmLogout() {
    Alert.alert("Logout karein?", "", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  }

  const isActive = user?.subscriptionStatus === "active";
  const lang = user?.preferredLanguage || "en";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}>
      {/* Profile header */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>

        <View style={[styles.planBadge, isActive ? styles.planBadgePremium : styles.planBadgeFree]}>
          <Ionicons name={isActive ? "star" : "person"} size={12} color={isActive ? "#B45309" : colors.slate} />
          <Text style={[styles.planBadgeText, { color: isActive ? "#B45309" : colors.slate }]}>
            {isActive ? "Premium Member" : "Free Plan"}
          </Text>
        </View>
      </View>

      {/* Subscription */}
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("Subscription")} activeOpacity={0.7}>
        <View style={[styles.rowIcon, { backgroundColor: "#FFFBEB" }]}>
          <Ionicons name="star" size={17} color="#B45309" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Subscription</Text>
          <Text style={styles.rowSub}>
            {isActive
              ? `Valid till ${
                  user.subscriptionExpiresAt
                    ? new Date(user.subscriptionExpiresAt).toLocaleDateString("en-IN")
                    : ""
                }`
              : "Upgrade karke sab unlock karo"}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate} />
      </TouchableOpacity>

      {/* Refer */}
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("Referral")} activeOpacity={0.7}>
        <View style={[styles.rowIcon, { backgroundColor: colors.brandLight }]}>
          <Ionicons name="gift" size={17} color={colors.brand} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Refer & Earn</Text>
          <Text style={styles.rowSub}>Dost ko refer karke credit kamao</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate} />
      </TouchableOpacity>

      {/* History */}
      <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("HistoryTab")} activeOpacity={0.7}>
        <View style={[styles.rowIcon, { backgroundColor: colors.slateLight }]}>
          <Ionicons name="time" size={17} color={colors.slate} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>Test History</Text>
          <Text style={styles.rowSub}>Apne purane tests dekho</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.slate} />
      </TouchableOpacity>

      {/* Language */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="language" size={16} color={colors.ink} />
          <Text style={styles.cardTitle}>Language</Text>
        </View>
        <Text style={styles.cardHint}>Tests mein questions kis bhasha mein dikhein</Text>
        <View style={styles.langRow}>
          {[
            { code: "en", label: "English" },
            { code: "hi", label: "हिंदी" },
          ].map((l) => {
            const active = lang === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                style={[styles.langChip, active && styles.langChipActive]}
                onPress={() => changeLanguage(l.code)}
                disabled={savingLang}
                activeOpacity={0.7}
              >
                <Text style={[styles.langChipText, active && styles.langChipTextActive]}>{l.label}</Text>
              </TouchableOpacity>
            );
          })}
          {savingLang && <ActivityIndicator size="small" color={colors.brand} />}
        </View>
      </View>

      {/* Email */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="mail" size={16} color={colors.ink} />
          <Text style={styles.cardTitle}>Email</Text>
        </View>
        <Text style={styles.cardHint}>Password bhoolne pe reset OTP isi pe aayega</Text>
        <View style={styles.emailRow}>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="aapka@email.com"
            placeholderTextColor={colors.slate}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveEmail}
            disabled={savingEmail || !email || email === user?.email}
            activeOpacity={0.8}
          >
            {savingEmail ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={17} color={colors.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.slateLight },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  avatarText: { color: "#fff", fontSize: 28, fontWeight: "800" },
  name: { fontSize: 19, fontWeight: "800", color: colors.ink },
  phone: { fontSize: 13, color: colors.slate, marginTop: 2 },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: spacing.sm,
  },
  planBadgePremium: { backgroundColor: "#FFFBEB" },
  planBadgeFree: { backgroundColor: colors.slateLight },
  planBadgeText: { fontSize: 12, fontWeight: "700" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  rowSub: { fontSize: 12, color: colors.slate, marginTop: 1 },

  card: {
    backgroundColor: "#fff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
  cardHint: { fontSize: 12, color: colors.slate, marginTop: 3, marginBottom: spacing.sm },

  langRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  langChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.slateLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  langChipText: { fontSize: 13, fontWeight: "600", color: colors.slate },
  langChipTextActive: { color: "#fff" },

  emailRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  emailInput: {
    flex: 1,
    backgroundColor: colors.slateLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 44,
    fontSize: 14,
    color: colors.ink,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 20,
    height: 44,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.dangerLight,
    height: 50,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
});