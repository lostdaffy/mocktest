import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, shadow } from "../theme/theme";

// A round back button, top-left, for Login and Signup. They are reached from
// the Welcome screen, and a student who tapped the wrong one needs a visible
// way back (Android's back key works too, but not everyone knows to use it).
export default function BackToWelcome({ navigation }) {
  const insets = useSafeAreaInsets();
  if (!navigation?.canGoBack?.()) return null;
  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      activeOpacity={0.8}
      accessibilityLabel="Back"
      style={[styles.btn, { top: insets.top + 8 }]}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="chevron-back" size={22} color={colors.ink} />
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
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    ...shadow.sm,
  },
});
