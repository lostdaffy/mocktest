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
import { useAuth } from "../context/AuthContext";
import { colors, spacing, radius } from "../theme/theme";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!phone || !password) {
      setError("Phone aur password dono daalo");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(phone, password);
    } catch (err) {
      setError(err.response?.data?.message || "Login fail hua. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <View style={styles.brandWrap}>
          <View style={styles.logoBox}>
            <Ionicons name="school" size={28} color="#fff" />
          </View>
          <Text style={styles.brandName}>Smart Test Engine</Text>
          <Text style={styles.brandTag}>Practice karo. Aage badho.</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Wapas aa gaye! 👋</Text>
          <Text style={styles.subtitle}>Login karke practice continue karo</Text>

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

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.slate} />
            <TextInput
              style={styles.input}
              placeholder="Apna password"
              placeholderTextColor={colors.slate}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass((s) => !s)}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotWrap} onPress={() => navigation.navigate("ForgotPassword")}>
            <Text style={styles.forgot}>Password bhool gaye?</Text>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Login Karo</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Naye ho? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
            <Text style={styles.footerLink}>Account banao</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.slateLight, padding: spacing.lg, justifyContent: "center" },

  brandWrap: { alignItems: "center", marginBottom: spacing.xl },
  logoBox: {
    width: 60,
    height: 60,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  brandName: { fontSize: 20, fontWeight: "800", color: colors.ink },
  brandTag: { fontSize: 13, color: colors.slate, marginTop: 2 },

  card: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 3, marginBottom: spacing.lg },

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

  forgotWrap: { alignSelf: "flex-end", marginBottom: spacing.md },
  forgot: { fontSize: 13, color: colors.brand, fontWeight: "600" },

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
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg },
  footerText: { fontSize: 14, color: colors.slate },
  footerLink: { fontSize: 14, color: colors.brand, fontWeight: "700" },
});