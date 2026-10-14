import { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "../theme/theme";

// Three short cards the first time a student opens Home: what the app has,
// and that the plan on Home tells them what to do each day. Shown once per
// install; the last button starts today's quiz straight away.

const KEY = "firstRunGuideSeen:v1";

const STEPS = [
  {
    icon: "flash",
    tint: "#4F46E5",
    title: "A new GK quiz every day",
    text: "20 questions at 12:00 AM, the same for every student. Take it and see your rank.",
  },
  {
    icon: "book",
    tint: "#16A34A",
    title: "Practice chapter by chapter",
    text: "Pick a chapter, then practise the whole chapter mixed or one subtopic at a time - Easy to Advanced.",
  },
  {
    icon: "document-text",
    tint: "#EA580C",
    title: "Mock tests like the real exam",
    text: "Full papers with the real time limit and negative marking, then a detailed analysis.",
  },
];

export default function FirstRunGuide({ onStart }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((seen) => !seen && setVisible(true))
      .catch(() => {});
  }, []);

  function close(start) {
    setVisible(false);
    AsyncStorage.setItem(KEY, "1").catch(() => {});
    if (start) onStart?.();
  }

  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => close(false)}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <TouchableOpacity onPress={() => close(false)} style={styles.skip} hitSlop={10} accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          <Text style={styles.welcome}>Welcome to Rankveer</Text>

          <View style={[styles.icon, { backgroundColor: s.tint }]}>
            <Ionicons name={s.icon} size={34} color="#FFFFFF" />
          </View>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.text}>{s.text}</Text>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === step && styles.dotOn]} />
            ))}
          </View>

          {last && (
            <Text style={styles.hint}>
              Every day, follow <Text style={{ fontWeight: "800", color: colors.ink }}>Today's plan</Text> on Home - it shows what to do next.
            </Text>
          )}

          <TouchableOpacity
            onPress={() => (last ? close(true) : setStep(step + 1))}
            style={styles.button}
            activeOpacity={0.85}
            accessibilityRole="button"
          >
            <Text style={styles.buttonText}>{last ? "Start today's quiz" : "Next"}</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(16,25,54,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, paddingBottom: spacing.xl, alignItems: "center" },
  skip: { alignSelf: "flex-end" },
  skipText: { fontSize: 13, fontWeight: "700", color: colors.slate },
  welcome: { fontSize: 12, fontWeight: "800", letterSpacing: 0.6, color: colors.brand, marginTop: 2 },
  icon: { width: 76, height: 76, borderRadius: 24, alignItems: "center", justifyContent: "center", marginTop: spacing.md },
  title: { fontSize: 20, fontWeight: "800", color: colors.ink, marginTop: spacing.md, textAlign: "center" },
  text: { fontSize: 14, lineHeight: 21, color: colors.slate, textAlign: "center", marginTop: 6, paddingHorizontal: spacing.sm },
  dots: { flexDirection: "row", gap: 6, marginTop: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  dotOn: { width: 22, backgroundColor: colors.brand },
  hint: { fontSize: 12.5, lineHeight: 18, color: colors.slate, textAlign: "center", marginTop: spacing.md },
  button: { flexDirection: "row", gap: 8, alignSelf: "stretch", height: 50, borderRadius: radius.md, backgroundColor: colors.brand, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  buttonText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
});
