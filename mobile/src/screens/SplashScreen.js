import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { gradients, spacing, radius, type } from "../theme/theme";

// Shown while the app checks for a saved login session - real branded
// moment instead of a bare spinner, and it's what a cold-start of the app
// looks like before the notch/home-indicator area is even relevant, so the
// gradient deliberately runs full-bleed under both.
export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(16)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient colors={gradients.hero} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
      <StatusBar style="light" />
      <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={styles.center}>
          <Animated.View style={[styles.logoWrap, { opacity: fade, transform: [{ scale: pulse }] }]}>
            <Text style={styles.logoText}>R</Text>
          </Animated.View>

          <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>
            <Text style={styles.brandName}>Rankveer</Text>
            <Text style={styles.tagline}>Practice with purpose. Rank with proof.</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.footer, { opacity: fade }]}>
          <View style={styles.dotsRow}>
            <View style={[styles.dot, styles.dotActive]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: spacing.xl },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  logoText: { color: "#fff", fontSize: 38, fontWeight: "800" },

  brandName: { ...type.display, color: "#fff", textAlign: "center", marginBottom: 6 },
  tagline: { ...type.small, color: "rgba(255,255,255,0.85)", textAlign: "center" },

  footer: { alignItems: "center", paddingBottom: spacing.md },
  dotsRow: { flexDirection: "row", gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.35)" },
  dotActive: { backgroundColor: "#fff", width: 20 },
});