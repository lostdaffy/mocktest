import { View } from "react-native";

// A flat stand-in for expo-linear-gradient's LinearGradient.
//
// The app is drawn in solid colours - no gradients. Screens that were built
// with a gradient keep their layout and just get one colour in its place:
// the middle stop of a three-stop gradient (that is the brand colour in the
// theme's gradients), or the darker of two, so white text on it stays legible.

function luminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return 1;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function solidOf(colors) {
  const list = (colors || []).filter(Boolean);
  if (!list.length) return "transparent";
  if (list.length >= 3) return list[Math.floor(list.length / 2)];
  if (list.length === 2) return luminance(list[0]) <= luminance(list[1]) ? list[0] : list[1];
  return list[0];
}

// eslint-disable-next-line no-unused-vars
export function LinearGradient({ colors, start, end, locations, style, children, ...rest }) {
  return (
    <View {...rest} style={[{ backgroundColor: solidOf(colors) }, style]}>
      {children}
    </View>
  );
}

export default LinearGradient;
