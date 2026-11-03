import { View, Text, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { spacing } from "../theme/theme";

// The navy band at the top of Login and Signup: the logo, one title, one line.
// It runs edge to edge (the screen's side padding is cancelled), and the form
// card below pulls up over its bottom edge.
const MARK = require("../../assets/icon.png");

export default function AuthHeader({ title, subtitle }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.band, { paddingTop: Math.max(insets.top, 16) + 56 }]}>
      <StatusBar style="light" />
      <View style={styles.glow} />
      <View style={styles.glow2} />
      <Image source={MARK} style={styles.mark} resizeMode="cover" />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
    </View>
  );
}

export const AUTH_OVERLAP = 28;

const styles = StyleSheet.create({
  band: {
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingBottom: 28 + AUTH_OVERLAP,
    backgroundColor: "#0A1230",
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: "hidden",
  },
  glow: { position: "absolute", width: 300, height: 300, borderRadius: 150, right: -110, top: -120, backgroundColor: "#4F46E5", opacity: 0.35 },
  glow2: { position: "absolute", width: 180, height: 180, borderRadius: 90, left: -70, bottom: -70, backgroundColor: "#7C3AED", opacity: 0.25 },
  mark: { width: 60, height: 60, borderRadius: 18, backgroundColor: "#FFFFFF", marginBottom: 18 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: "800", letterSpacing: -0.8, color: "#FFFFFF" },
  sub: { fontSize: 14.5, lineHeight: 20, color: "rgba(255,255,255,0.66)", marginTop: 6 },
});
