import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image, ScrollView, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing, radius, shadow } from "../theme/theme";
import { AffiliationNote } from "../components/OfficialSources";

// The first screen a signed-out student sees: one clear choice - make an
// account, or log in. The hero is drawn in code (no screenshots to go stale):
// a mock-test card, a language chip, a solution chip and a quiz chip floating
// over a deep-navy field, with a white sheet carrying the two buttons.

const LOGO = require("../../assets/brand-logo.png");

const NAVY = "#0B1437";
const NAVY_SOFT = "#16235A";
const VIOLET = "#7C3AED";

const EXAMS = ["SSC", "Railway", "UP Police", "UPSSSC PET", "CTET · UPTET", "Banking", "Agniveer"];

// One element drifting up and down, forever, out of step with the others.
function useFloat(distance, duration, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, duration, delay]);
  return { transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -distance] }) }] };
}

function Chip({ style, icon, tint, bg, children }) {
  return (
    <Animated.View style={[styles.chip, { backgroundColor: bg }, style]}>
      <View style={[styles.chipIcon, { backgroundColor: tint + "22" }]}>
        <Ionicons name={icon} size={14} color={tint} />
      </View>
      <Text style={styles.chipText}>{children}</Text>
    </Animated.View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const stage = Math.min(width - 40, 360);
  const heroHeight = Math.max(310, Math.min(370, height * 0.42));

  const floatCard = useFloat(7, 2600);
  const floatLang = useFloat(9, 2100, 300);
  const floatSol = useFloat(8, 2400, 600);
  const floatQuiz = useFloat(10, 2800, 150);

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 650, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);
  const rise = { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      <ScrollView bounces={false} showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1 }}>
        {/* ---------------------------------------------------- HERO */}
        <View style={[styles.hero, { height: heroHeight + insets.top, paddingTop: insets.top + 14 }]}>
          <View style={[styles.ring, { width: 360, height: 360, borderRadius: 180, top: -150, right: -130, borderWidth: 46 }]} />
          <View style={[styles.ring, { width: 260, height: 260, borderRadius: 130, bottom: -90, left: -110, borderWidth: 34 }]} />
          <View style={styles.glow} />

          <View style={styles.logoPill}>
            <Image source={LOGO} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={{ width: stage, height: heroHeight - 84, alignSelf: "center", marginTop: 14 }}>
            {/* the mock-test card */}
            <Animated.View style={[styles.qCard, { width: stage * 0.78 }, floatCard]}>
              <View style={styles.qTop}>
                <Text style={styles.qExam}>SSC CGL · Mock test</Text>
                <View style={styles.timer}>
                  <Ionicons name="time-outline" size={11} color="#DC3545" />
                  <Text style={styles.timerText}>42:18</Text>
                </View>
              </View>
              <View style={styles.bar}>
                <View style={styles.barFill} />
              </View>
              <Text style={styles.qText}>If 20% of a number is 45, what is 35% of the same number?</Text>
              {[
                ["A", "70", false],
                ["B", "78.75", true],
              ].map(([k, v, on]) => (
                <View key={k} style={[styles.opt, on && styles.optOn]}>
                  <View style={[styles.optKey, on && styles.optKeyOn]}>
                    <Text style={[styles.optKeyText, on && { color: "#fff" }]}>{k}</Text>
                  </View>
                  <Text style={[styles.optText, on && { color: colors.brandDark }]}>{v}</Text>
                  {on && <Ionicons name="checkmark-circle" size={16} color={colors.brand} style={{ marginLeft: "auto" }} />}
                </View>
              ))}
            </Animated.View>

            <Chip style={[{ right: 0, top: 6 }, floatLang]} icon="language" tint={colors.brand} bg="#FFFFFF">
              हिंदी · English
            </Chip>
            <Chip style={[{ right: 4, top: heroHeight * 0.4 }, floatSol]} icon="checkmark-done" tint="#16A34A" bg="#FFFFFF">
              Full solutions
            </Chip>
            <Chip style={[{ left: 0, bottom: 16 }, floatQuiz]} icon="flame" tint="#EA580C" bg="#FFFFFF">
              Daily GK quiz
            </Chip>
          </View>
        </View>

        {/* ---------------------------------------------------- SHEET */}
        <Animated.View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }, rise]}>
          <Text style={styles.eyebrow}>FREE TO START · NO CARD NEEDED</Text>
          <Text style={styles.title}>
            Prepare on the <Text style={{ color: colors.brand }}>real exam pattern.</Text>
          </Text>
          <Text style={styles.sub}>सरकारी परीक्षा की तैयारी — मॉक टेस्ट, प्रैक्टिस और डेली क्विज़, हिंदी और English में।</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.examRow}>
            {EXAMS.map((e) => (
              <View key={e} style={styles.examPill}>
                <Text style={styles.examText}>{e}</Text>
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity activeOpacity={0.88} style={styles.primary} onPress={() => navigation.navigate("Signup")}>
            <View style={{ flex: 1 }}>
              <Text style={styles.primaryTitle}>Create free account</Text>
              <Text style={styles.primaryHint}>New here? Start in under a minute</Text>
            </View>
            <View style={styles.arrow}>
              <Ionicons name="arrow-forward" size={20} color={colors.brand} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85} style={styles.secondary} onPress={() => navigation.navigate("Login")}>
            <Ionicons name="log-in-outline" size={20} color={colors.ink} />
            <Text style={styles.secondaryText}>I already have an account</Text>
            <Text style={styles.secondaryLink}>Log in</Text>
          </TouchableOpacity>

          <AffiliationNote style={{ marginTop: spacing.lg }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  hero: { backgroundColor: NAVY, overflow: "hidden" },
  ring: { position: "absolute", borderColor: "rgba(255,255,255,0.06)" },
  glow: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: VIOLET,
    opacity: 0.28,
    right: -60,
    top: 90,
  },

  logoPill: {
    alignSelf: "flex-start",
    marginLeft: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logo: { width: 112, height: 28 },

  qCard: {
    position: "absolute",
    left: 4,
    top: 22,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 14,
    transform: [{ rotate: "-3deg" }],
    ...shadow.lg,
  },
  qTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qExam: { fontSize: 10.5, fontWeight: "700", color: colors.slate },
  timer: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#FEF0F2", paddingHorizontal: 7, paddingVertical: 3, borderRadius: 99 },
  timerText: { fontSize: 10.5, fontWeight: "800", color: "#DC3545" },
  bar: { height: 4, borderRadius: 4, backgroundColor: "#E3E6EF", marginVertical: 9, overflow: "hidden" },
  barFill: { width: "26%", height: 4, borderRadius: 4, backgroundColor: colors.brand },
  qText: { fontSize: 13, fontWeight: "700", color: colors.ink, lineHeight: 18, marginBottom: 9 },
  opt: { flexDirection: "row", alignItems: "center", gap: 9, borderWidth: 1.5, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, marginTop: 6 },
  optOn: { borderColor: colors.brand, backgroundColor: "#F5F3FF" },
  optKey: { width: 20, height: 20, borderRadius: 6, backgroundColor: "#F1F3F8", alignItems: "center", justifyContent: "center" },
  optKeyOn: { backgroundColor: colors.brand },
  optKeyText: { fontSize: 10.5, fontWeight: "800", color: colors.slate },
  optText: { fontSize: 12.5, fontWeight: "700", color: colors.inkSoft },

  chip: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 7,
    paddingRight: 13,
    paddingVertical: 7,
    borderRadius: 99,
    ...shadow.md,
  },
  chipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  chipText: { fontSize: 12.5, fontWeight: "800", color: colors.ink },

  sheet: {
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    marginTop: -30,
    paddingHorizontal: 22,
    paddingTop: 26,
  },
  eyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2, color: colors.brand },
  title: { fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -0.6, color: colors.ink, marginTop: 8 },
  sub: { fontSize: 14, lineHeight: 21, color: colors.slate, marginTop: 8 },

  examRow: { gap: 8, paddingVertical: 16, paddingRight: 10, alignItems: "center" },
  examPill: { backgroundColor: "#F5F3FF", borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  examText: { fontSize: 12, fontWeight: "700", color: colors.brandDark },

  primary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand,
    borderRadius: 20,
    paddingVertical: 15,
    paddingLeft: 22,
    paddingRight: 14,
    ...shadow.md,
  },
  primaryTitle: { fontSize: 17, fontWeight: "800", color: "#FFFFFF" },
  primaryHint: { fontSize: 12, color: "rgba(255,255,255,0.78)", marginTop: 2 },
  arrow: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },

  secondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: 20,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  secondaryText: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink },
  secondaryLink: { fontSize: 15, fontWeight: "800", color: colors.brand },
});
