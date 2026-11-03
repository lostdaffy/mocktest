import { View, Text, Image, StyleSheet } from "react-native";
import { useTheme } from "../theme/theme";

// The Rankveer mark and name, drawn from the app icon plus live text, so it
// reads on both the light and the dark background (the old logo image had
// dark lettering baked in and vanished in dark mode).
const MARK = require("../../assets/icon.png");

export default function BrandMark({ size = 36, style }) {
  const colors = useTheme();
  return (
    <View style={[styles.row, style]}>
      <Image source={MARK} style={{ width: size, height: size, borderRadius: size * 0.3 }} resizeMode="cover" />
      <Text style={[styles.name, { fontSize: size * 0.62, color: colors.ink }]}>
        Rank<Text style={{ color: colors.brand }}>veer</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  name: { fontWeight: "800", letterSpacing: -0.6 },
});
