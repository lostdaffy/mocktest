import {
  useEffect,
  useRef,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Image,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  gradients,
  spacing,
  radius,
  type,
} from "../theme/theme";

/* =========================================================
   SPLASH SCREEN
========================================================= */

export default function SplashScreen() {
  const insets = useSafeAreaInsets();

  const fade =
    useRef(new Animated.Value(0)).current;

  const rise =
    useRef(new Animated.Value(18)).current;

  const pulse =
    useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 550,
        easing: Easing.out(
          Easing.cubic
        ),
        useNativeDriver: true,
      }),

      Animated.timing(rise, {
        toValue: 0,
        duration: 550,
        easing: Easing.out(
          Easing.cubic
        ),
        useNativeDriver: true,
      }),
    ]).start();

    const pulseAnimation =
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.06,
            duration: 1100,
            easing: Easing.inOut(
              Easing.ease
            ),
            useNativeDriver: true,
          }),

          Animated.timing(pulse, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(
              Easing.ease
            ),
            useNativeDriver: true,
          }),
        ])
      );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [fade, rise, pulse]);

  return (
    <LinearGradient
      colors={gradients.hero}
      start={{
        x: 0.05,
        y: 0,
      }}
      end={{
        x: 0.95,
        y: 1,
      }}
      style={styles.fill}
    >
      <StatusBar style="light" />

      {/* Decorative background */}

      <View style={styles.orbOne} />
      <View style={styles.orbTwo} />
      <View style={styles.orbThree} />

      <View
        style={[
          styles.content,
          {
            paddingTop:
              insets.top,
            paddingBottom:
              insets.bottom +
              spacing.xl,
          },
        ]}
      >
        {/* =================================================
            CENTER
        ================================================= */}

        <View style={styles.center}>
          {/* LOGO */}

          <Animated.View
            style={[
              styles.logoOuter,
              {
                opacity: fade,
                transform: [
                  {
                    scale: pulse,
                  },
                ],
              },
            ]}
          >
            <View
              style={styles.logoInner}
            >
              <Image
                source={require("../../assets/brand-logo.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </Animated.View>

          {/* BRAND */}

          <Animated.View
            style={[
              styles.brandContent,
              {
                opacity: fade,
                transform: [
                  {
                    translateY: rise,
                  },
                ],
              },
            ]}
          >
            <Text
              style={styles.brandName}
            >
              Rankveer
            </Text>

            <Text
              style={styles.tagline}
            >
              Practice with purpose.
              {"\n"}
              Rank with proof.
            </Text>
          </Animated.View>
        </View>

        {/* =================================================
            FOOTER
        ================================================= */}

        <Animated.View
          style={[
            styles.footer,
            {
              opacity: fade,
            },
          ]}
        >
          <View
            style={styles.dotsRow}
          >
            <View
              style={[
                styles.dot,
                styles.dotActive,
              ]}
            />

            <View
              style={styles.dot}
            />

            <View
              style={styles.dot}
            />
          </View>

          <Text
            style={styles.footerText}
          >
            Preparing your experience
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },

  content: {
    flex: 1,
    justifyContent:
      "space-between",
    paddingHorizontal:
      spacing.xl,
  },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent:
      "center",
  },

  /* =====================================================
     BACKGROUND ORBS
  ===================================================== */

  orbOne: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -120,
    right: -100,
    backgroundColor:
      "rgba(255,255,255,0.07)",
  },

  orbTwo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    bottom: -90,
    left: -80,
    backgroundColor:
      "rgba(255,255,255,0.05)",
  },

  orbThree: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    top: "36%",
    right: -55,
    backgroundColor:
      "rgba(255,255,255,0.04)",
  },

  /* =====================================================
     LOGO
  ===================================================== */

  logoOuter: {
    width: 112,
    height: 112,
    borderRadius: 32,
    backgroundColor:
      "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor:
      "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },

  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 27,
    backgroundColor:
      "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },

  logo: {
    width: 66,
    height: 66,
  },

  /* =====================================================
     BRAND
  ===================================================== */

  brandContent: {
    alignItems: "center",
  },

  brandName: {
    ...type.display,
    color: "#FFFFFF",
    textAlign: "center",
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "900",
    letterSpacing: -0.8,
  },

  tagline: {
    ...type.small,
    color:
      "rgba(255,255,255,0.84)",
    textAlign: "center",
    marginTop: 7,
    lineHeight: 18,
    fontWeight: "500",
  },

  /* =====================================================
     FOOTER
  ===================================================== */

  footer: {
    alignItems: "center",
    paddingBottom: spacing.md,
  },

  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      "rgba(255,255,255,0.30)",
  },

  dotActive: {
    width: 22,
    backgroundColor: "#FFFFFF",
  },

  footerText: {
    marginTop: 10,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "600",
    color:
      "rgba(255,255,255,0.55)",
    letterSpacing: 0.2,
  },
});