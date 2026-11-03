import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AffiliationNote } from "../components/OfficialSources";

// The first screen a signed-out student sees. Almost no words: the logo in the
// middle of two slowly turning rings of icons, one headline, two buttons.

const MARK = require("../../assets/icon.png");

const NAVY = "#0A1230";
const VIOLET = "#7C3AED";
const BRAND = "#4F46E5";

// Icons on the rings: [icon, colour, angle in degrees]
const INNER = [
  ["book", "#A78BFA", 0],
  ["trophy", "#FBBF24", 120],
  ["flame", "#FB923C", 240],
];
const OUTER = [
  ["stats-chart", "#34D399", 40],
  ["time", "#F87171", 130],
  ["language", "#60A5FA", 220],
  ["ribbon", "#F472B6", 310],
];

// One ring turning forever. The icons on it turn the opposite way at the same
// speed, so they always stay upright.
function Ring({ radius, items, seconds, reverse, box }) {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: seconds * 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin, seconds]);
  const dir = reverse ? -1 : 1;
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${360 * dir}deg`] });
  const unrot = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", `${-360 * dir}deg`] });
  const size = radius * 2;

  return (
    <Animated.View style={[styles.ring, { width: size, height: size, borderRadius: radius, left: (box - size) / 2, top: (box - size) / 2, transform: [{ rotate: rot }] }]}>
      {items.map(([icon, color, deg]) => {
        const a = (deg * Math.PI) / 180;
        const x = radius + radius * Math.sin(a) - 22;
        const y = radius - radius * Math.cos(a) - 22;
        return (
          <Animated.View key={icon} style={[styles.bubble, { left: x, top: y, transform: [{ rotate: unrot }] }]}>
            <Ionicons name={icon} size={21} color={color} />
          </Animated.View>
        );
      })}
    </Animated.View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const stage = Math.min(width, 420);
  const outer = Math.min(stage * 0.43, height * 0.2);
  const inner = outer * 0.62;
  const box = outer * 2 + 44;

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 700, delay: 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [enter]);
  const rise = { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }] };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* soft light behind everything */}
      <View style={[styles.glow, { width: width * 1.3, height: width * 1.3, borderRadius: width * 0.65, top: -width * 0.25 }]} />
      <View style={[styles.glow2, { width: width * 0.8, height: width * 0.8, borderRadius: width * 0.4, bottom: -width * 0.2, left: -width * 0.3 }]} />

      {/* the logo and its rings */}
      <View style={[styles.stage, { paddingTop: insets.top + 20 }]}>
        <View style={{ width: box, height: box, alignItems: "center", justifyContent: "center" }}>
          <View style={[styles.guide, { width: outer * 2, height: outer * 2, borderRadius: outer }]} />
          <View style={[styles.guide, { width: inner * 2, height: inner * 2, borderRadius: inner }]} />
          <Ring radius={outer} items={OUTER} seconds={46} reverse box={box} />
          <Ring radius={inner} items={INNER} seconds={30} box={box} />
          <Animated.View
            style={[
              styles.mark,
              { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] }) }] },
            ]}
          >
            <Image source={MARK} style={styles.markImg} resizeMode="cover" />
          </Animated.View>
        </View>
      </View>

      {/* the words and the two buttons */}
      <Animated.View style={[styles.bottom, { paddingBottom: Math.max(insets.bottom, 18) + 6 }, rise]}>
        <Text style={styles.title}>
          Rank your{"\n"}
          <Text style={{ color: "#A78BFA" }}>way up.</Text>
        </Text>

        <TouchableOpacity activeOpacity={0.9} style={styles.primary} onPress={() => navigation.navigate("Signup")}>
          <Text style={styles.primaryText}>Get started</Text>
          <View style={styles.arrow}>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.8} style={styles.secondary} onPress={() => navigation.navigate("Login")}>
          <Text style={styles.secondaryText}>I have an account</Text>
        </TouchableOpacity>

        <AffiliationNote style={{ marginTop: 18 }} color="rgba(255,255,255,0.38)" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, overflow: "hidden" },
  glow: { position: "absolute", alignSelf: "center", backgroundColor: BRAND, opacity: 0.2 },
  glow2: { position: "absolute", backgroundColor: VIOLET, opacity: 0.16 },

  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  guide: { position: "absolute", borderWidth: 1, borderColor: "rgba(255,255,255,0.09)" },
  ring: { position: "absolute" },
  center: { position: "absolute", alignItems: "center", justifyContent: "center" },
  bubble: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  mark: {
    width: 104,
    height: 104,
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: VIOLET,
    shadowOpacity: 0.75,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  markImg: { width: "100%", height: "100%" },

  bottom: { paddingHorizontal: 24 },
  title: { fontSize: 44, lineHeight: 50, fontWeight: "800", letterSpacing: -1.4, color: "#FFFFFF", marginBottom: 26 },

  primary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 28,
    paddingRight: 8,
  },
  primaryText: { fontSize: 18, fontWeight: "800", color: NAVY },
  arrow: { width: 48, height: 48, borderRadius: 24, backgroundColor: BRAND, alignItems: "center", justifyContent: "center" },

  secondary: {
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
  },
  secondaryText: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
});
