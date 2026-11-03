import { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Easing, Image } from "react-native";
import { StatusBar } from "expo-status-bar";

// Shown while the saved login is read. Same look as the Welcome screen so the
// two feel like one: navy, the logo in the middle, soft rings spreading out
// from it, the name, and a thin bar filling underneath.

const MARK = require("../../assets/icon.png");
const NAVY = "#0A1230";
const VIOLET = "#7C3AED";

// One ring that grows from behind the logo and fades. `delay` staggers three of them.
function Ripple({ delay }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(t, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [t, delay]);
  return (
    <Animated.View
      style={[
        styles.ripple,
        {
          opacity: t.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.35, 0] }),
          transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.6] }) }],
        },
      ]}
    />
  );
}

export default function SplashScreen() {
  const enter = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    Animated.timing(bar, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
  }, [enter, bar]);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.glow} />

      <View style={styles.center}>
        <View style={styles.logoWrap}>
          <Ripple delay={0} />
          <Ripple delay={800} />
          <Ripple delay={1600} />
          <Animated.View style={[styles.mark, { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }]}>
            <Image source={MARK} style={styles.markImg} resizeMode="cover" />
          </Animated.View>
        </View>

        <Animated.Text style={[styles.name, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
          Rank<Text style={{ color: "#A78BFA" }}>veer</Text>
        </Animated.Text>
      </View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { transform: [{ scaleX: bar }] }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY, alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute", width: 520, height: 520, borderRadius: 260, backgroundColor: "#4F46E5", opacity: 0.18 },
  center: { alignItems: "center" },
  logoWrap: { width: 112, height: 112, alignItems: "center", justifyContent: "center", marginBottom: 30 },
  ripple: { position: "absolute", width: 112, height: 112, borderRadius: 56, borderWidth: 1.5, borderColor: "#A78BFA" },
  mark: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: VIOLET,
    shadowOpacity: 0.75,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  markImg: { width: "100%", height: "100%" },
  name: { fontSize: 38, fontWeight: "800", letterSpacing: -1, color: "#FFFFFF" },
  track: { position: "absolute", bottom: 64, width: 120, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.12)", overflow: "hidden" },
  fill: { width: "100%", height: "100%", backgroundColor: "#A78BFA", transformOrigin: "left" },
});
