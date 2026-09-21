import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  colors,
  gradients,
  spacing,
  radius,
  shadow,
} from "../theme/theme";

const RANKVEER_LOGO = require("../../assets/brand-logo.png");

/* =========================================================
   FORCE UPDATE SCREEN
   Shown instead of the whole app when the backend says this
   build is below the minimum supported version. There is
   deliberately no "skip" - if it could be dismissed, it
   couldn't do its one job.
========================================================= */

export default function ForceUpdateScreen({
  storeUrl,
  message,
  installedVersion,
  minVersion,
}) {
  const insets = useSafeAreaInsets();

  function openStore() {
    if (storeUrl) Linking.openURL(storeUrl).catch(() => {});
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
        },
      ]}
    >
      <Image
        source={RANKVEER_LOGO}
        style={styles.logo}
        resizeMode="contain"
      />

      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="cloud-download-outline"
            size={30}
            color={colors.brand}
          />
        </View>

        <Text style={styles.title}>
          Update required
        </Text>

        <Text style={styles.body}>
          {message ||
            "A new version of Rankveer is available with important improvements. Please update to keep practicing."}
        </Text>

        <View style={styles.versionRow}>
          <Text style={styles.versionText}>
            Your version {installedVersion}
          </Text>
          <View style={styles.versionDot} />
          <Text style={styles.versionText}>
            Required {minVersion}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openStore}
          style={styles.buttonWrap}
        >
          <LinearGradient
            colors={gradients.brand}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
          >
            <Ionicons
              name="logo-google-playstore"
              size={17}
              color="#FFFFFF"
            />
            <Text style={styles.buttonText}>
              Update now
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>
        Your progress and subscription are saved to your account and will
        be there after you update.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },

  logo: {
    width: 190,
    height: 52,
    marginBottom: spacing.xl,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    alignItems: "center",
    ...shadow.md,
  },

  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },

  title: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.ink,
    letterSpacing: -0.4,
    marginBottom: spacing.sm,
  },

  body: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.slate,
    textAlign: "center",
    marginBottom: spacing.md,
  },

  versionRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.slateLight,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: spacing.lg,
  },

  versionText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.slate,
  },

  versionDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.slateSoft,
    marginHorizontal: 8,
  },

  buttonWrap: {
    width: "100%",
    borderRadius: radius.md,
    ...shadow.brand,
  },

  button: {
    height: 52,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.slateSoft,
    textAlign: "center",
    marginTop: spacing.lg,
    maxWidth: 320,
  },
});
