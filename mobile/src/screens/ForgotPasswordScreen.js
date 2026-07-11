import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import api from "../api/client";
import { colors, spacing, radius } from "../theme/theme";

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 = request OTP, 2 = enter OTP + new password
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function requestOtp() {
    if (!phone || phone.length !== 10) {
      setError("10 digit ka phone number daalo");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { phone });
      setInfo(res.data.message || "OTP aapke email pe bhej diya hai");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "OTP bhejne mein problem hui");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!otp || !newPassword) {
      setError("OTP aur naya password dono daalo");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password kam se kam 6 characters ka ho");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { phone, otp, newPassword });
      Alert.alert("Ho gaya!", "Password reset ho gaya. Ab naye password se login karo.", [
        { text: "Login Karo", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Reset fail hua. OTP check karo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.iconWrap}>
          <Ionicons name={step === 1 ? "lock-open" : "key"} size={26} color={colors.brand} />
        </View>

        <Text style={styles.title}>{step === 1 ? "Password Bhool Gaye?" : "Naya Password Set Karo"}</Text>
        <Text style={styles.subtitle}>
          {step === 1
            ? "Apna phone number daalo — OTP aapke registered email pe aayega"
            : "Email pe aaya OTP daalo aur naya password set karo"}
        </Text>

        {/* Step indicator */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]} />
          <View style={[styles.stepBar, step === 2 && styles.stepBarActive]} />
          <View style={[styles.stepDot, step === 2 && styles.stepDotActive]} />
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={18} color={colors.slate} />
                <TextInput
                  style={styles.input}
                  placeholder="10 digit mobile number"
                  placeholderTextColor={colors.slate}
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phone}
                  onChangeText={setPhone}
                />
              </View>
            </>
          ) : (
            <>
              {info ? (
                <View style={styles.infoBox}>
                  <Ionicons name="mail" size={15} color={colors.brand} />
                  <Text style={styles.infoText}>{info}</Text>
                </View>
              ) : null}

              <Text style={styles.label}>OTP</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="keypad-outline" size={18} color={colors.slate} />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="6 digit OTP"
                  placeholderTextColor={colors.slate}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                />
              </View>

              <Text style={styles.label}>Naya Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.slate} />
                <TextInput
                  style={styles.input}
                  placeholder="Kam se kam 6 characters"
                  placeholderTextColor={colors.slate}
                  secureTextEntry={!showPass}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setShowPass((s) => !s)}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.slate} />
                </TouchableOpacity>
              </View>
            </>
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.button}
            onPress={step === 1 ? requestOtp : resetPassword}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>{step === 1 ? "OTP Bhejo" : "Password Reset Karo"}</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {step === 2 && (
            <TouchableOpacity style={styles.backLink} onPress={() => setStep(1)}>
              <Text style={styles.backLinkText}>Phone number badalna hai?</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.footer} onPress={() => navigation.navigate("Login")}>
          <Ionicons name="arrow-back" size={15} color={colors.brand} />
          <Text style={styles.footerText}>Login pe wapas jao</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.slateLight, padding: spacing.lg, justifyContent: "center" },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  title: { fontSize: 21, fontWeight: "800", color: colors.ink, textAlign: "center" },
  subtitle: {
    fontSize: 13,
    color: colors.slate,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
    paddingHorizontal: spacing.md,
  },

  stepRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginVertical: spacing.lg },
  stepDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.border },
  stepDotActive: { backgroundColor: colors.brand },
  stepBar: { width: 40, height: 2, backgroundColor: colors.border },
  stepBarActive: { backgroundColor: colors.brand },

  card: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.slateLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 50,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 15, color: colors.ink },
  otpInput: { letterSpacing: 6, fontWeight: "700" },

  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.brandLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  infoText: { flex: 1, fontSize: 12, color: colors.brand, lineHeight: 17 },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.dangerLight,
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  errorText: { flex: 1, fontSize: 12, color: colors.danger },

  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    height: 52,
    borderRadius: radius.md,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  backLink: { alignItems: "center", paddingTop: spacing.md },
  backLinkText: { fontSize: 13, color: colors.slate, fontWeight: "600" },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: spacing.lg },
  footerText: { fontSize: 14, color: colors.brand, fontWeight: "700" },
});