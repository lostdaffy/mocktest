import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import { colors, gradients, spacing, radius, type, shadow } from "../theme/theme";

const EXAMS = [
  { code: "SSC_CGL", label: "SSC", icon: "school" },
  { code: "UP_POLICE", label: "UP Police", icon: "shield-checkmark" },
  { code: "RAILWAY", label: "Railway", icon: "train" },
  { code: "BANKING", label: "Banking", icon: "card" },
  { code: "CTET", label: "CTET", icon: "person" },
];

export default function SignupScreen({ navigation }) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [selectedExam, setSelectedExam] = useState("SSC_CGL");
  const [focused, setFocused] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !phone || !password) {
      setError("Name, phone and password are required");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signup(name, phone, password, [selectedExam], email, referralCode);
    } catch (err) {
      setError(err.response?.data?.message || "Sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const field = (key) => [styles.inputWrap, focused === key && styles.inputWrapFocused];
  const iconColor = (key) => (focused === key ? colors.brand : colors.slateSoft);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandWrap}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBox}>
            <Ionicons name="school" size={25} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>Free to start — no card needed</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full name</Text>
          <View style={field("name")}>
            <Ionicons name="person-outline" size={18} color={iconColor("name")} />
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={colors.slateSoft}
              value={name}
              onChangeText={setName}
              onFocus={() => setFocused("name")}
              onBlur={() => setFocused(null)}
            />
          </View>

          <Text style={styles.label}>Phone number</Text>
          <View style={field("phone")}>
            <Ionicons name="call-outline" size={18} color={iconColor("phone")} />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.slateSoft}
              keyboardType="phone-pad"
              maxLength={10}
              value={phone}
              onChangeText={setPhone}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
            />
          </View>

          <Text style={styles.label}>
            Email <Text style={styles.optional}>· for password reset</Text>
          </Text>
          <View style={field("email")}>
            <Ionicons name="mail-outline" size={18} color={iconColor("email")} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={colors.slateSoft}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused("email")}
              onBlur={() => setFocused(null)}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={field("pass")}>
            <Ionicons name="lock-closed-outline" size={18} color={iconColor("pass")} />
            <TextInput
              style={styles.input}
              placeholder="At least 6 characters"
              placeholderTextColor={colors.slateSoft}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocused("pass")}
              onBlur={() => setFocused(null)}
            />
            <TouchableOpacity onPress={() => setShowPass((s) => !s)} hitSlop={8}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.slateSoft} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Which exam are you preparing for?</Text>
          <View style={styles.examGrid}>
            {EXAMS.map((exam) => {
              const active = selectedExam === exam.code;
              return (
                <TouchableOpacity
                  key={exam.code}
                  style={[styles.examChip, active && styles.examChipActive]}
                  onPress={() => setSelectedExam(exam.code)}
                  activeOpacity={0.75}
                >
                  <Ionicons name={exam.icon} size={14} color={active ? "#fff" : colors.slate} />
                  <Text style={[styles.examChipText, active && styles.examChipTextActive]}>{exam.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>
            Referral code <Text style={styles.optional}>· optional</Text>
          </Text>
          <View style={field("ref")}>
            <Ionicons name="gift-outline" size={18} color={iconColor("ref")} />
            <TextInput
              style={styles.input}
              placeholder="Friend's code"
              placeholderTextColor={colors.slateSoft}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
              onFocus={() => setFocused("ref")}
              onBlur={() => setFocused(null)}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>Get Started</Text>
                  <Ionicons name="arrow-forward" size={17} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerLink}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, paddingTop: 46 },

  brandWrap: { alignItems: "center", marginBottom: spacing.lg },
  logoBox: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...shadow.brand,
  },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.small, color: colors.slate, marginTop: 3 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  label: { ...type.tiny, fontWeight: "700", color: colors.inkSoft, marginBottom: 7 },
  optional: { fontWeight: "500", color: colors.slateSoft },

  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 52,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  inputWrapFocused: { borderColor: colors.brand, backgroundColor: colors.brandTint },
  input: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: "500" },

  examGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  examChipActive: { backgroundColor: colors.brand, borderColor: colors.brand, ...shadow.sm },
  examChipText: { ...type.small, fontWeight: "700", color: colors.slate },
  examChipTextActive: { color: "#fff" },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.dangerLight,
    padding: 11,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  errorText: { flex: 1, ...type.small, color: colors.danger },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 54,
    borderRadius: radius.md,
    ...shadow.brand,
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  footerText: { ...type.body, color: colors.slate },
  footerLink: { ...type.bodyStrong, color: colors.brand },
});