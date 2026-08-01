import { useEffect, useState } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import AppAlert from "./AppAlert";
import { colors, radius, type } from "../theme/theme";
import { GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID } from "../config/google";

// Needed once, app-wide, for the browser-based auth flow to hand control
// back to the app when it's done.
WebBrowser.maybeCompleteAuthSession();

// One button, works for both login and signup - the backend decides which
// one it is (see authController.js googleAuth: creates on first use, logs
// in on every use after).
export default function GoogleSignInButton({ label = "Continue with Google" }) {
  const { googleLogin } = useAuth();
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    async function handleResponse() {
      if (response?.type !== "success") {
        if (response?.type === "error") {
          AppAlert.alert("Google sign-in failed", "Please try again", [{ text: "OK" }], { type: "danger" });
        }
        return;
      }
      const idToken = response.authentication?.idToken || response.params?.id_token;
      if (!idToken) {
        AppAlert.alert("Google sign-in failed", "Didn't get a valid token back. Please try again.", [{ text: "OK" }], {
          type: "danger",
        });
        return;
      }
      setLoading(true);
      try {
        await googleLogin(idToken);
        // Navigation happens automatically - the root navigator switches to
        // the app stack the moment AuthContext's user state is set.
      } catch (err) {
        AppAlert.alert(
          "Couldn't sign you in",
          err.response?.data?.message || "Please try again",
          [{ text: "OK" }],
          { type: "danger" }
        );
      } finally {
        setLoading(false);
      }
    }
    handleResponse();
  }, [response]);

  return (
    <TouchableOpacity
      style={styles.button}
      activeOpacity={0.8}
      disabled={!request || loading}
      onPress={() => promptAsync()}
    >
      {loading ? (
        <ActivityIndicator color={colors.ink} />
      ) : (
        <>
          <Ionicons name="logo-google" size={18} color="#EA4335" />
          <Text style={styles.text}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  text: { ...type.bodyStrong, color: colors.ink },
});