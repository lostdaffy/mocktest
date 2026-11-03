import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// A round back button, top-left, for Login, Signup and Forgot password. They
// sit on the navy header band, so the button is a frosted white circle with a
// white arrow in both light and dark mode. (Android's back key works too, but
// not everyone knows to use it.)
export default function BackToWelcome({ navigation }) {
  const insets = useSafeAreaInsets();
  if (!navigation?.canGoBack?.()) return null;
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      activeOpacity={0.8}
      accessibilityLabel="Back"
      style={[styles.btn, { top: Math.max(insets.top, 16) + 6 }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: "absolute",
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});
