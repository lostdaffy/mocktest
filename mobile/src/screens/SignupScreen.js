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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!name || !phone || !password) {
      setError("Naam, phone aur password zaroori hain");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await signup(name, phone, password, [selectedExam], email, referralCode);
    } catch (err) {
      setError(err.response?.data?.message || "Signup fail hua. Dobara try karo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brandWrap}>
          <View style={styles.logoBox}>
            <Ionicons name="school" size={26} color="#fff" />
          </View>
          <Text style={styles.title}>Account Banao</Text>
          <Text style={styles.subtitle}>Free mein shuru karo — koi card nahi chahiye</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Aapka Naam</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={18} color={colors.slate} />
            <TextInput
              style={styles.input}
              placeholder="Pura naam"
              placeholderTextColor={colors.slate}
              value={name}
              onChangeText={setName}
            />
          </View>

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

          <Text style={styles.label}>
            Email <Text style={styles.optional}>(password reset ke liye)</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={colors.slate} />
            <TextInput
              style={styles.input}
              placeholder="aapka@email.com"
              placeholderTextColor={colors.slate}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.slate} />
            <TextInput
              style={styles.input}
              placeholder="Kam se kam 6 characters"
              placeholderTextColor={colors.slate}
              secureTextEntry={!showPass}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPass((s) => !s)}>
              <Ionicons name={showPass ? "eye-off-outline" : "eye-outline"} size={18} color={colors.slate} />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Aapka Exam</Text>
          <View style={styles.examGrid}>
            {EXAMS.map((exam) => {
              const active = selectedExam === exam.code;
              return (
                <TouchableOpacity
                  key={exam.code}
                  style={[styles.examChip, active && styles.examChipActive]}
                  onPress={() => setSelectedExam(exam.code)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={exam.icon} size={15} color={active ? "#fff" : colors.slate} />
                  <Text style={[styles.examChipText, active && styles.examChipTextActive]}>{exam.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>
            Referral Code <Text style={styles.optional}>(optional)</Text>
          </Text>
          <View style={styles.inputWrap}>
            <Ionicons name="gift-outline" size={18} color={colors.slate} />
            <TextInput
              style={styles.input}
              placeholder="Dost ka code"
              placeholderTextColor={colors.slate}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={setReferralCode}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={15} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.buttonText}>Shuru Karo</Text>
                <Ionicons name="arrow-forward" size={17} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Pehle se account hai? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.footerLink}>Login karo</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.slateLight, padding: spacing.lg, paddingTop: 50 },

  brandWrap: { alignItems: "center", marginBottom: spacing.lg },
  logoBox: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  title: { fontSize: 21, fontWeight: "800", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.slate, marginTop: 3 },

  card: {
    backgroundColor: "#fff",
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  optional: { fontWeight: "500", color: colors.slate },
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

  examGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.full,
    backgroundColor: colors.slateLight,
    borderWidth: 1,
    borderColor: colors.border,
  },
  examChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  examChipText: { fontSize: 13, fontWeight: "600", color: colors.slate },
  examChipTextActive: { color: "#fff" },

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

  footer: { flexDirection: "row", justifyContent: "center", marginTop: spacing.lg, marginBottom: spacing.lg },
  footerText: { fontSize: 14, color: colors.slate },
  footerLink: { fontSize: 14, color: colors.brand, fontWeight: "700" },
});