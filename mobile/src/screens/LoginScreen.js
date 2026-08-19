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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../context/AuthContext";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { GOOGLE_SIGNIN_ENABLED } from "../config/google";
import { colors, gradients, spacing, radius, type, shadow } from "../theme/theme";

export default function LoginScreen({ navigation }) {
  const { login, requestOtp, loginWithOtp } = useAuth();

  const [mode, setMode] = useState("password"); // "password" | "otp"
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [focused, setFocused] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");

  function switchMode(next) {
    setMode(next);
    setError("");
    setOtpSent(false);
    setOtp("");
  }

  async function handlePasswordLogin() {
    if (!phone || !password) {
      setError("Enter your phone number and password");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err) {
      if (err.response?.data?.code === "GOOGLE_ACCOUNT") {
        setError(err.response.data.message);
      } else {
        setError(err.response?.data?.message || "Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSendOtp() {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await requestOtp(phone);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send OTP");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setResending(true);
    try {
      await requestOtp(phone);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't resend OTP");
    } finally {
      setResending(false);
    }
  }

  async function handleOtpLogin() {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await loginWithOtp(phone, otp);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const iconColor = (key) => (focused === key ? colors.brand : colors.slateSoft);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brandWrap}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logoBox}>
            <Ionicons name="school" size={28} color="#fff" />
          </LinearGradient>
          <Text style={styles.brandName}>Rankveer</Text>
          <Text style={styles.brandTag}>Practice smarter. Score higher.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue your preparation</Text>

          {/* Password / OTP toggle */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeTab, mode === "password" && styles.modeTabActive]}
              onPress={() => switchMode("password")}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, mode === "password" && styles.modeTabTextActive]}>Password</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, mode === "otp" && styles.modeTabActive]}
              onPress={() => switchMode("otp")}
              activeOpacity={0.8}
            >
              <Text style={[styles.modeTabText, mode === "otp" && styles.modeTabTextActive]}>OTP</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Phone number</Text>
          <View style={[styles.inputWrap, focused === "phone" && styles.inputWrapFocused]}>
            <Ionicons name="call-outline" size={18} color={iconColor("phone")} />
            <TextInput
              style={styles.input}
              placeholder="10-digit mobile number"
              placeholderTextColor={colors.slateSoft}
              keyboardType="phone-pad"
              maxLength={10}
              editable={!(mode === "otp" && otpSent)}
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/[^0-9]/g, ""))}
              onFocus={() => setFocused("phone")}
              onBlur={() => setFocused(null)}
            />
          </View>

          {mode === "password" ? (
            <>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, focused === "pass" && styles.inputWrapFocused]}>
                <Ionicons name="lock-closed-outline" size={18} color={iconColor("pass")} />
                <TextInput
                  style={styles.input}
                  placeholder="Your password"
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

              <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate("ForgotPassword")}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </TouchableOpacity>
            </>
          ) : otpSent ? (
            <>
              <Text style={styles.label}>Verification code</Text>
              <View style={[styles.inputWrap, focused === "otp" && styles.inputWrapFocused]}>
                <Ionicons name="keypad-outline" size={18} color={iconColor("otp")} />
                <TextInput
                  style={[styles.input, styles.otpInput]}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.slateSoft}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(v) => setOtp(v.replace(/[^0-9]/g, ""))}
                  onFocus={() => setFocused("otp")}
                  onBlur={() => setFocused(null)}
                  autoFocus
                />
              </View>
              <TouchableOpacity onPress={handleResendOtp} disabled={resending} style={styles.forgotWrap}>
                <Text style={styles.forgot}>{resending ? "Sending..." : "Resend code"}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={{ marginBottom: spacing.sm }} />
          )}

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={mode === "password" ? handlePasswordLogin : otpSent ? handleOtpLogin : handleSendOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buttonText}>
                    {mode === "password" ? "Sign In" : otpSent ? "Verify & Sign In" : "Send OTP"}
                  </Text>
                  <Ionicons name="arrow-forward" size={17} color="#fff" />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {GOOGLE_SIGNIN_ENABLED && (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <GoogleSignInButton label="Continue with Google" />
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New here? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.footerLink}>Create an account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: "center" },

  brandWrap: { alignItems: "center", marginBottom: spacing.xl },
  logoBox: {
    width: 62,
    height: 62,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    ...shadow.brand,
  },
  brandName: { fontSize: 21, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  brandTag: { ...type.small, color: colors.slate, marginTop: 3 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.md,
  },
  title: { ...type.h1, color: colors.ink },
  subtitle: { ...type.small, color: colors.slate, marginTop: 4, marginBottom: spacing.lg },

  modeToggle: {
    flexDirection: "row",
    backgroundColor: colors.slateLight,
    borderRadius: radius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  modeTab: { flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center" },
  modeTabActive: { backgroundColor: colors.surface, ...shadow.sm },
  modeTabText: { ...type.small, fontWeight: "700", color: colors.slate },
  modeTabTextActive: { color: colors.brand },

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

  forgotWrap: { alignSelf: "flex-end", marginBottom: spacing.md },
  forgot: { ...type.small, color: colors.brand, fontWeight: "700" },

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

  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...type.tiny, color: colors.slateSoft, fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  footerText: { ...type.body, color: colors.slate },
  footerLink: { ...type.bodyStrong, color: colors.brand },
});