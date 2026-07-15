import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from "react-native";
import AppAlert from "../components/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { colors, gradients, spacing, radius, type, shadow, card } from "../theme/theme";

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
      AppAlert.alert("Saved", "Your email has been updated");
    } catch (err) {
      AppAlert.alert("Couldn't save", err.response?.data?.message || "Please try again");
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
      AppAlert.alert("Couldn't update", "Please try again");
    } finally {
      setSavingLang(false);
    }
  }

  function confirmLogout() {
    AppAlert.alert("Log out?", "You'll need to sign in again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Log out", style: "destructive", onPress: logout },
    ]);
  }

  const isActive = user?.subscriptionStatus === "active";
  const lang = user?.preferredLanguage || "en";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.profileCard}>
        <View style={styles.ring} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || "?"}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>

        <View style={styles.planBadge}>
          <Ionicons name={isActive ? "star" : "person"} size={11} color="#fff" />
          <Text style={styles.planBadgeText}>{isActive ? "Premium Member" : "Free Plan"}</Text>
        </View>
      </LinearGradient>

      {/* Rows */}
      <Row
        icon="star"
        tint={colors.warn}
        bg={colors.warnLight}
        title="Subscription"
        sub={
          isActive
            ? `Valid till ${user.subscriptionExpiresAt ? new Date(user.subscriptionExpiresAt).toLocaleDateString("en-IN") : "—"}`
            : "Upgrade to unlock everything"
        }
        onPress={() => navigation.navigate("Subscription")}
      />
      <Row
        icon="gift"
        tint={colors.success}
        bg={colors.successLight}
        title="Refer & Earn"
        sub="Earn credit for every friend who joins"
        onPress={() => navigation.navigate("Referral")}
      />
      <Row
        icon="time"
        tint={colors.brand}
        bg={colors.brandLight}
        title="Test History"
        sub="Review your past attempts"
        onPress={() => navigation.navigate("HistoryTab")}
      />
      <Row
        icon="stats-chart"
        tint={colors.advanced}
        bg={colors.advancedBg}
        title="My Analysis"
        sub="Topic-wise strengths and gaps"
        onPress={() => navigation.navigate("Analysis")}
      />

      {/* Language */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <Ionicons name="language" size={16} color={colors.ink} />
          <Text style={styles.settingTitle}>Question language</Text>
        </View>
        <Text style={styles.settingHint}>Which language questions appear in during tests</Text>
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
                activeOpacity={0.75}
              >
                <Text style={[styles.langChipText, active && styles.langChipTextActive]}>{l.label}</Text>
              </TouchableOpacity>
            );
          })}
          {savingLang && <ActivityIndicator size="small" color={colors.brand} />}
        </View>
      </View>

      {/* Email */}
      <View style={styles.settingCard}>
        <View style={styles.settingHeader}>
          <Ionicons name="mail" size={16} color={colors.ink} />
          <Text style={styles.settingTitle}>Email</Text>
        </View>
        <Text style={styles.settingHint}>Password-reset codes are sent here</Text>
        <View style={styles.emailRow}>
          <TextInput
            style={styles.emailInput}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.slateSoft}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.saveButton, (!email || email === user?.email) && styles.saveButtonDisabled]}
            onPress={saveEmail}
            disabled={savingEmail || !email || email === user?.email}
            activeOpacity={0.85}
          >
            {savingEmail ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={17} color={colors.danger} />
        <Text style={styles.logoutText}>Log out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ icon, tint, bg, title, sub, onPress }) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.rowIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={17} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={17} color={colors.slateSoft} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },

  profileCard: {
    borderRadius: radius.xxl,
    padding: spacing.lg,
    alignItems: "center",
    marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow.brand,
  },
  ring: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 26,
    borderColor: "rgba(255,255,255,0.06)",
    top: -80,
    right: -60,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: { color: "#fff", fontSize: 30, fontWeight: "800" },
  name: { fontSize: 20, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  phone: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginTop: 12,
  },
  planBadgeText: { fontSize: 11, fontWeight: "700", color: "#fff" },

  row: { ...card, flexDirection: "row", alignItems: "center", gap: 11, padding: spacing.md, marginBottom: 10 },
  rowIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  rowTitle: { ...type.bodyStrong, color: colors.ink },
  rowSub: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 1 },

  settingCard: { ...card, padding: spacing.md, marginTop: 6, marginBottom: 10 },
  settingHeader: { flexDirection: "row", alignItems: "center", gap: 7 },
  settingTitle: { ...type.bodyStrong, color: colors.ink },
  settingHint: { ...type.tiny, color: colors.slateSoft, fontWeight: "500", marginTop: 3, marginBottom: 11 },

  langRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  langChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  langChipText: { ...type.small, fontWeight: "700", color: colors.slate },
  langChipTextActive: { color: "#fff" },

  emailRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  emailInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 46,
    fontSize: 14,
    color: colors.ink,
    fontWeight: "500",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 22,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonDisabled: { backgroundColor: colors.slateSoft },
  saveButtonText: { color: "#fff", ...type.small, fontWeight: "700" },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: colors.dangerLight,
    height: 52,
    borderRadius: radius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  logoutText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
});