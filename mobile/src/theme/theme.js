// Design system for Smart Test Engine.
// One source of truth so every screen looks like it belongs to the same app.

export const colors = {
  // Brand
  brand: "#1053F3",
  brandDark: "#0B3EC1",
  brandDarker: "#082C8C",
  brandLight: "#E8EFFE",
  brandTint: "#F5F8FF",

  // Text
  ink: "#0F1729",
  inkSoft: "#334155",
  slate: "#64748B",
  slateSoft: "#94A3B8",

  // Surfaces
  bg: "#F7F9FC",
  surface: "#FFFFFF",
  slateLight: "#F1F5F9",
  border: "#E7ECF3",
  borderSoft: "#F1F5F9",

  // Semantic
  success: "#059669",
  successLight: "#ECFDF5",
  successBorder: "#A7F3D0",
  danger: "#DC2626",
  dangerLight: "#FEF2F2",
  dangerBorder: "#FECACA",
  warn: "#D97706",
  warnLight: "#FFFBEB",
  warnBorder: "#FDE68A",
  flag: "#F59E0B",
  flagLight: "#FFFBEB",

  // Difficulty ladder
  easy: "#059669",
  easyBg: "#ECFDF5",
  medium: "#0284C7",
  mediumBg: "#E0F2FE",
  hard: "#EA580C",
  hardBg: "#FFF7ED",
  advanced: "#7C3AED",
  advancedBg: "#F3E8FF",

  white: "#FFFFFF",
};

// Subtle gradients — depth without looking gimmicky.
export const gradients = {
  brand: ["#1E5FFF", "#0B3EC1"],
  brandVivid: ["#3B7BFF", "#0B3EC1"],
  hero: ["#2563EB", "#1053F3", "#0B3EC1"],
  premium: ["#F59E0B", "#D97706"],
  success: ["#10B981", "#059669"],
  danger: ["#EF4444", "#DC2626"],
  dark: ["#1E293B", "#0F1729"],
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 44 };

export const radius = { xs: 6, sm: 10, md: 14, lg: 18, xl: 24, xxl: 28, full: 999 };

// Type scale — consistent hierarchy across screens.
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

// Elevation — soft, layered shadows (not the harsh default).
export const shadow = {
  sm: {
    shadowColor: "#0F1729",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: "#0F1729",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  lg: {
    shadowColor: "#0F1729",
    shadowOpacity: 0.1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  brand: {
    shadowColor: "#1053F3",
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
};

// Reusable card style so every card matches.
export const card = {
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: colors.border,
  ...shadow.sm,
};
