// Rankveer design system v2 — warm, soft, card-based visual language.
// Colors and layout patterns match the approved reference design; content
// and features stay Rankveer's own (SSC/Railway/Police/Banking/CTET, not
// the reference's JEE/NEET example content).
//
// NOTE ON BRAND COLOR: this switches the mobile app's primary accent from
// the blue (#1053F3) used everywhere else (admin panel, logo, emails) to
// the warm coral used in the reference design, per explicit instruction
// that colors should match the reference too, not just the layout. This
// means the mobile app and admin panel will look like different brands
// side by side until/unless the admin panel is updated to match - flagging
// this clearly since it's a real, visible inconsistency now.

export const colors = {
  // Brand — warm coral, matching the reference
  brand: "#FF6B4A",
  brandDark: "#E8532F",
  brandDarker: "#C23F1F",
  brandLight: "#FFE4DB",
  brandTint: "#FFF3EF",

  // Secondary dark (used for high-emphasis buttons like "Start Practice",
  // "Choose Plan" in the reference — a near-black, not the coral)
  ink2: "#1F2A37",
  ink2Light: "#EEF0F2",

  // Text
  ink: "#1A2027",
  inkSoft: "#3D4A5C",
  slate: "#6B7684",
  slateSoft: "#9AA3AF",

  // Surfaces
  bg: "#F8F8FB",
  surface: "#FFFFFF",
  slateLight: "#F2F2F6",
  border: "#EDEDF2",
  borderSoft: "#F5F5F8",

  // Semantic
  success: "#16A34A",
  successLight: "#EAFBF0",
  successBorder: "#BBF0D0",
  danger: "#E11D48",
  dangerLight: "#FEF1F4",
  dangerBorder: "#FBD0DB",
  warn: "#D97706",
  warnLight: "#FFF7EA",
  warnBorder: "#FCE2AE",
  flag: "#F59E0B",
  flagLight: "#FFF7EA",

  // Difficulty ladder
  easy: "#16A34A",
  easyBg: "#EAFBF0",
  medium: "#2563EB",
  mediumBg: "#EAF1FE",
  hard: "#EA580C",
  hardBg: "#FFF1E8",
  advanced: "#7C3AED",
  advancedBg: "#F3EBFE",

  white: "#FFFFFF",

  // Soft hero card tones (the "Practice Today" card in the reference is a
  // light lavender tint, not a bold gradient - distinct from the coral
  // brand color used everywhere else)
  heroTint: "#EEEAFB",
  heroAccent: "#7C5CFC",
  heroRing: "#FFD9CE",

  // Category palette — for subject/feature icon badges (Physics/Chemistry-
  // style colorful chips in the reference). Cycle through these by index
  // for any list of subjects/categories so each one reads distinctly.
  categories: [
    { bg: "#EAF1FE", fg: "#3B7BFF" }, // blue
    { bg: "#FEF1F4", fg: "#F43F7A" }, // pink
    { bg: "#EAFBF0", fg: "#16A34A" }, // green
    { bg: "#F3EBFE", fg: "#8B5CF6" }, // purple
    { bg: "#FFF1E8", fg: "#F97316" }, // orange
    { bg: "#EAFCFC", fg: "#0EA5A5" }, // teal
  ],
};

export const gradients = {
  brand: ["#FF8563", "#FF6B4A"],
  brandVivid: ["#FF9B7A", "#E8532F"],
  hero: ["#FF9B7A", "#FF6B4A", "#E8532F"],
  premium: ["#F59E0B", "#D97706"],
  success: ["#34D399", "#16A34A"],
  danger: ["#F87171", "#E11D48"],
  dark: ["#2B3542", "#1A2027"],
};

// Base spacing scale — unchanged in *values* (dp scales naturally with
// screen size in RN), but every screen now reads insets for edge spacing
// instead of hardcoding top/bottom padding. See safeArea below.
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 44 };

export const radius = { xs: 8, sm: 12, md: 16, lg: 20, xl: 26, xxl: 32, full: 999 };

export const type = {
  display: { fontSize: 28, fontWeight: "800", letterSpacing: -0.5 },
  h1: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  h2: { fontSize: 18, fontWeight: "800", letterSpacing: -0.2 },
  h3: { fontSize: 16, fontWeight: "700" },
  body: { fontSize: 14, fontWeight: "500" },
  bodyStrong: { fontSize: 14, fontWeight: "700" },
  small: { fontSize: 12, fontWeight: "500" },
  tiny: { fontSize: 11, fontWeight: "600" },
  micro: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
};

export const shadow = {
  sm: {
    shadowColor: "#1A2027",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  md: {
    shadowColor: "#1A2027",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#1A2027",
    shadowOpacity: 0.1,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  brand: {
    shadowColor: "#FF6B4A",
    shadowOpacity: 0.3,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadow.sm,
};

// --- Responsive / device-safety helpers ---
//
// Every screen should size against the ACTUAL device rather than a fixed
// number, so this works on a notch, a punch-hole, an old small phone, and
// a big modern 6.7" screen without special-casing any of them individually.
//
// Usage pattern (in each screen):
//   import { useSafeAreaInsets } from "react-native-safe-area-context";
//   const insets = useSafeAreaInsets();
//   <View style={{ paddingTop: insets.top + spacing.sm }}>
//
// TAB_BAR_HEIGHT is the *content* height of the bottom nav bar, not
// including the safe-area inset - add insets.bottom on top of this when
// sizing the actual nav bar, and add both together as scroll-content
// bottom padding so the last item is never hidden behind the bar.
export const TAB_BAR_HEIGHT = 60;

// Standard breakpoint for "large" phones (most modern phones, 6.5"+) vs
// smaller/older devices - used sparingly to nudge a handful of values
// (e.g. hero card image size) rather than to fork entire layouts, since
// flex-based layouts should adapt on their own for anything else.
import { Dimensions } from "react-native";
export function isLargeScreen() {
  return Dimensions.get("window").width >= 390;
}