import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import AppAlert from "../components/AppAlert";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import api from "../api/client";
import { colors, gradients, spacing, radius, type, shadow } from "../theme/theme";

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState(1); // 1 = request code, 2 = reset
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentTo, setSentTo] = useState("");

  async function requestOtp() {
    if (!phone) {
      setError("Enter your phone number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/forgot-password", { phone });
      setSentTo(res.data.maskedEmail || "your registered email");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send the code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!otp || !newPassword) {
      setError("Enter the code and your new password");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { phone, otp, newPassword });
      AppAlert.alert("Password reset", "You can now sign in with your new password", [
        { text: "Sign in", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (err) {
      setError(err.response?.data?.message || "Reset failed. Check the code and try again.");
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
            <Ionicons name="lock-open" size={25} color="#fff" />
          </LinearGradient>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            {step === 1 ? "We'll email you a verification code" : `Code sent to ${sentTo}`}
          </Text>
        </View>

        {/* Step indicator */}
        <View style={styles.steps}>
          <View style={styles.stepItem}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              {step > 1 ? <Ionicons name="checkmark" size={12} color="#fff" /> : <Text style={styles.stepDotText}>1</Text>}
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]}>Verify</Text>
          </View>

          <View style={[styles.stepBar, step === 2 && styles.stepBarActive]} />

          <View style={styles.stepItem}>
            <View style={[styles.stepDot, step === 2 && styles.stepDotActive]}>
              <Text style={[styles.stepDotText, step !== 2 && styles.stepDotTextInactive]}>2</Text>
            </View>
            <Text style={[styles.stepLabel, step === 2 && styles.stepLabelActive]}>New password</Text>
          </View>
        </View>

        <View style={styles.card}>
          {step === 1 ? (
            <>
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

              <View style={styles.hintBox}>
                <Ionicons name="information-circle-outline" size={15} color={colors.brand} />
                <Text style={styles.hintText}>
                  The code goes to the email saved on your account. No email saved? Contact support.
                </Text>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity onPress={requestOtp} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Send Code</Text>
                      <Ionicons name="arrow-forward" size={17} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Verification code</Text>
              <View style={field("otp")}>
                <Ionicons name="keypad-outline" size={18} color={iconColor("otp")} />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.slateSoft}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={setOtp}
                  onFocus={() => setFocused("otp")}
                  onBlur={() => setFocused(null)}
                />
              </View>

              <Text style={styles.label}>New password</Text>
              <View style={field("pass")}>
                <Ionicons name="lock-closed-outline" size={18} color={iconColor("pass")} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.slateSoft}
                  secureTextEntry={!showPass}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  onFocus={() => setFocused("pass")}
                  onBlur={() => setFocused(null)}
                />
                <TouchableOpacity onPress={() => setShowPass((s) => !s)} hitSlop={8}>
                  <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.slateSoft} />
                </TouchableOpacity>
              </View>

              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={15} color={colors.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <TouchableOpacity onPress={resetPassword} disabled={loading} activeOpacity={0.85}>
                <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Reset Password</Text>
                      <Ionicons name="checkmark" size={17} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity style={styles.resendWrap} onPress={() => setStep(1)}>
                <Text style={styles.resend}>Didn't get the code? Try again</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <TouchableOpacity style={styles.backWrap} onPress={() => navigation.navigate("Login")}>
          <Ionicons name="arrow-back" size={15} color={colors.slate} />
          <Text style={styles.backText}>Back to sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: "center" },

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
  subtitle: { ...type.small, color: colors.slate, marginTop: 4, textAlign: "center" },

  steps: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  stepItem: { alignItems: "center", gap: 5 },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.slateLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: colors.brand },
  stepDotText: { fontSize: 12, fontWeight: "800", color: "#fff" },
  stepDotTextInactive: { color: colors.slateSoft },
  stepLabel: { ...type.tiny, color: colors.slateSoft, fontWeight: "600" },
  stepLabelActive: { color: colors.brand },
  stepBar: { width: 50, height: 2, backgroundColor: colors.border, marginHorizontal: 10, marginBottom: 18 },
  stepBarActive: { backgroundColor: colors.brand },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  label: { ...type.tiny, fontWeight: "700", color: colors.inkSoft, marginBottom: 7 },
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
  otpInput: { letterSpacing: 6, fontWeight: "700", fontSize: 17 },

  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.brandTint,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.brandLight,
  },
  hintText: { flex: 1, ...type.small, color: colors.brand, lineHeight: 18, fontWeight: "600" },

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

  resendWrap: { alignItems: "center", marginTop: spacing.md },
  resend: { ...type.small, color: colors.brand, fontWeight: "700" },

  backWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, marginTop: spacing.lg },
  backText: { ...type.bodyStrong, color: colors.slate },
});