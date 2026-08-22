// =========================================================
// RANKVEER DESIGN SYSTEM
// Navy • Royal Blue • Violet • Premium Education
// Light + Dark Mode Ready
// Compatibility Safe
// =========================================================

import { Dimensions } from "react-native";

/* =========================================================
   BRAND IDENTITY
========================================================= */

export const brand = {
  // Primary brand color inspired by Rankveer logo
  primary: "#4F46E5",

  // Strong royal violet
  dark: "#3730A3",

  // Deep navy-violet
  darker: "#172554",

  // Light brand surface
  light: "#EDEBFF",

  // Very soft brand tint
  tint: "#F5F3FF",

  // Dark mode primary
  darkMode: "#8B7CFF",

  // Supporting logo blue
  blue: "#2563EB",

  // Supporting logo violet
  violet: "#7C3AED",

  // Bright lavender
  lavender: "#A78BFA",

  // Deep logo navy
  navy: "#172554",
};

/* =========================================================
   LIGHT THEME
========================================================= */

const lightTheme = {
  /* =======================================================
     BRAND
  ======================================================= */

  brand: "#4F46E5",
  brandDark: "#3730A3",
  brandDarker: "#172554",

  brandLight: "#EDEBFF",
  brandTint: "#F5F3FF",

  /* Useful brand aliases */

  brandBlue: "#2563EB",
  brandViolet: "#7C3AED",
  brandLavender: "#A78BFA",
  brandNavy: "#172554",

  /* =======================================================
     SECONDARY DARK
  ======================================================= */

  ink2: "#172554",
  ink2Light: "#EEF2FF",

  /* =======================================================
     TEXT
  ======================================================= */

  ink: "#101936",
  inkSoft: "#34405F",

  slate: "#667085",
  slateSoft: "#98A2B3",

  /* =======================================================
     SURFACES
  ======================================================= */

  bg: "#F7F8FC",

  surface: "#FFFFFF",

  surfaceSoft: "#FBFCFF",

  surfaceElevated: "#FFFFFF",

  slateLight: "#F1F3F8",

  /* =======================================================
     BORDERS
  ======================================================= */

  border: "#E5E7F0",

  borderSoft: "#F0F1F6",

  borderStrong: "#D9DDEA",

  /* =======================================================
     SUCCESS
  ======================================================= */

  success: "#16A34A",

  successLight: "#EAF8F0",

  successBorder: "#BCE8CD",

  /* =======================================================
     DANGER
  ======================================================= */

  danger: "#DC3545",

  dangerLight: "#FEF0F2",

  dangerBorder: "#F6C9CF",

  /* =======================================================
     WARNING
  ======================================================= */

  warn: "#D97706",

  warnLight: "#FFF7E8",

  warnBorder: "#F5D9A6",

  /* =======================================================
     INFO
  ======================================================= */

  info: "#2563EB",

  infoLight: "#EAF1FF",

  infoBorder: "#C9DCFF",

  /* =======================================================
     FLAG
  ======================================================= */

  flag: "#F59E0B",

  flagLight: "#FFF7E8",

  /* =======================================================
     DIFFICULTY
  ======================================================= */

  easy: "#16A34A",

  easyBg: "#EAF8F0",

  medium: "#2563EB",

  mediumBg: "#EAF1FF",

  hard: "#EA580C",

  hardBg: "#FFF1E8",

  advanced: "#7C3AED",

  advancedBg: "#F3EDFF",

  /* =======================================================
     BASIC
  ======================================================= */

  white: "#FFFFFF",

  black: "#000000",

  transparent: "transparent",

  /* =======================================================
     HOME / HERO
     
     IMPORTANT:
     Hero now belongs to Rankveer's brand family.
     No unrelated coral/purple combination.
  ======================================================= */

  heroTint: "#EEF0FF",

  heroAccent: "#4F46E5",

  heroRing: "#D9D7FF",

  heroStrong: "#3730A3",

  /* =======================================================
     CATEGORY COLORS
     
     These are supporting semantic/category colors.
     They should NOT overpower the brand.
  ======================================================= */

  categories: [
    {
      // Royal Blue
      bg: "#EAF1FF",
      fg: "#2563EB",
    },

    {
      // Violet
      bg: "#F1EDFF",
      fg: "#7C3AED",
    },

    {
      // Green
      bg: "#EAF8F0",
      fg: "#16A34A",
    },

    {
      // Lavender
      bg: "#EEEAFE",
      fg: "#6D5AE6",
    },

    {
      // Soft Blue
      bg: "#EDF4FF",
      fg: "#3B82F6",
    },

    {
      // Teal
      bg: "#EAF9F9",
      fg: "#0F8F8F",
    },
  ],

  /* =======================================================
     PREMIUM
  ======================================================= */

  premium: {
    fg: "#72530A",

    bg: "#FFF8E6",

    border: "#F3E0A8",

    // Premium icon remains Rankveer branded
    icon: "#4F46E5",
  },

  /* =======================================================
     OTHER
  ======================================================= */

  overlay: "rgba(15, 23, 42, 0.48)",

  divider: "#E5E7F0",
};

/* =========================================================
   DARK THEME
========================================================= */

const darkTheme = {
  /* =======================================================
     BRAND
  ======================================================= */

  brand: "#8B7CFF",

  brandDark: "#7163E8",

  brandDarker: "#4C43A5",

  brandLight: "#292653",

  brandTint: "#211F3F",

  /* BRAND ALIASES */

  brandBlue: "#5B8DEF",

  brandViolet: "#9B7BFF",

  brandLavender: "#B8ADFF",

  brandNavy: "#172554",

  /* =======================================================
     SECONDARY
  ======================================================= */

  ink2: "#F3F5FF",

  ink2Light: "#252A3A",

  /* =======================================================
     TEXT
  ======================================================= */

  ink: "#F5F7FF",

  inkSoft: "#D4D9E8",

  slate: "#A5AEC0",

  slateSoft: "#7F899D",

  /* =======================================================
     SURFACES
  ======================================================= */

  bg: "#0B1020",

  surface: "#151B2E",

  surfaceSoft: "#1A2135",

  surfaceElevated: "#1E263B",

  slateLight: "#252C40",

  /* =======================================================
     BORDERS
  ======================================================= */

  border: "#2A3247",

  borderSoft: "#20273A",

  borderStrong: "#374158",

  /* =======================================================
     SUCCESS
  ======================================================= */

  success: "#35C989",

  successLight: "#173629",

  successBorder: "#245B43",

  /* =======================================================
     DANGER
  ======================================================= */

  danger: "#F06470",

  dangerLight: "#3A2026",

  dangerBorder: "#60303A",

  /* =======================================================
     WARNING
  ======================================================= */

  warn: "#E6A33A",

  warnLight: "#392C19",

  warnBorder: "#604A25",

  /* =======================================================
     INFO
  ======================================================= */

  info: "#65A1F5",

  infoLight: "#1B2C46",

  infoBorder: "#294A72",

  /* =======================================================
     FLAG
  ======================================================= */

  flag: "#F5B43E",

  flagLight: "#392C19",

  /* =======================================================
     DIFFICULTY
  ======================================================= */

  easy: "#35C989",

  easyBg: "#173629",

  medium: "#65A1F5",

  mediumBg: "#1B2C46",

  hard: "#F28A4C",

  hardBg: "#3A261B",

  advanced: "#A77AF4",

  advancedBg: "#302448",

  /* =======================================================
     BASIC
  ======================================================= */

  white: "#FFFFFF",

  black: "#000000",

  transparent: "transparent",

  /* =======================================================
     HERO
  ======================================================= */

  heroTint: "#242442",

  heroAccent: "#9B8CFF",

  heroRing: "#443F70",

  heroStrong: "#7163E8",

  /* =======================================================
     CATEGORY COLORS
  ======================================================= */

  categories: [
    {
      bg: "#1B2C46",
      fg: "#6FA5FF",
    },

    {
      bg: "#302448",
      fg: "#A77AF4",
    },

    {
      bg: "#173629",
      fg: "#35C989",
    },

    {
      bg: "#292653",
      fg: "#A99AFF",
    },

    {
      bg: "#1B2C46",
      fg: "#6FA5FF",
    },

    {
      bg: "#173536",
      fg: "#35BFC0",
    },
  ],

  /* =======================================================
     PREMIUM
  ======================================================= */

  premium: {
    fg: "#F0B95A",

    bg: "#392C19",

    border: "#604A25",

    icon: "#8B7CFF",
  },

  /* =======================================================
     OTHER
  ======================================================= */

  overlay: "rgba(0, 0, 0, 0.70)",

  divider: "#2A3247",
};

/* =========================================================
   COMPATIBILITY EXPORT
========================================================= */

/*
  Existing screens currently use:

    import { colors } from "../theme/theme";

  and directly access:

    colors.brand
    colors.success
    colors.danger
    colors.warn
    colors.medium
    colors.hard
    colors.heroAccent
    colors.categories

  Therefore colors remains a complete LIGHT theme object.

  For actual dark-mode rendering use:

    const colors = getColors(isDark);
*/

export const colors = lightTheme;

/* =========================================================
   THEME GETTER
========================================================= */

export function getColors(isDark = false) {
  return isDark
    ? darkTheme
    : lightTheme;
}

/* =========================================================
   GRADIENTS
========================================================= */

/*
  Gradients now follow the actual Rankveer logo.
  No coral brand gradient.
*/

export const gradients = {
  /* Main Rankveer gradient */

  brand: [
    "#2563EB",
    "#4F46E5",
    "#7C3AED",
  ],

  /* Strong premium brand gradient */

  brandVivid: [
    "#3730A3",
    "#4F46E5",
    "#7C3AED",
  ],

  /* Home / hero */

  hero: [
    "#5B6FF5",
    "#4F46E5",
    "#6D4AEF",
  ],

  /* Premium */

  premium: [
    "#F59E0B",
    "#D97706",
  ],

  /* Success */

  success: [
    "#34D399",
    "#16A34A",
  ],

  /* Danger */

  danger: [
    "#F87171",
    "#DC3545",
  ],

  /* Information */

  info: [
    "#60A5FA",
    "#2563EB",
  ],

  /* Dark */

  dark: [
    "#1E293B",
    "#0F172A",
  ],
};

/* =========================================================
   SPACING
========================================================= */

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44,
};

/* =========================================================
   RADIUS
========================================================= */

export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 32,
  full: 999,
};

/* =========================================================
   TYPOGRAPHY
========================================================= */

export const type = {
  display: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
  },

  h1: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  h2: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "800",
    letterSpacing: -0.2,
  },

  h3: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "700",
  },

  body: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },

  bodyStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "700",
  },

  small: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },

  tiny: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },

  micro: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
};

/* =========================================================
   SHADOWS
========================================================= */

export const shadow = {
  sm: {
    shadowColor: "#101936",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  md: {
    shadowColor: "#101936",
    shadowOpacity: 0.07,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  lg: {
    shadowColor: "#101936",
    shadowOpacity: 0.10,
    shadowRadius: 26,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 8,
  },

  /* Rankveer branded shadow */

  brand: {
    shadowColor: "#4F46E5",
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 6,
  },

  /* Dark mode */

  darkSm: {
    shadowColor: "#000000",
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  darkMd: {
    shadowColor: "#000000",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 4,
  },

  darkLg: {
    shadowColor: "#000000",
    shadowOpacity: 0.42,
    shadowRadius: 26,
    shadowOffset: {
      width: 0,
      height: 10,
    },
    elevation: 8,
  },

  darkBrand: {
    shadowColor: "#8B7CFF",
    shadowOpacity: 0.20,
    shadowRadius: 18,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 6,
  },
};

/* =========================================================
   LIGHT CARD
========================================================= */

export const card = {
  backgroundColor: lightTheme.surface,

  borderRadius: radius.lg,

  borderWidth: 1,

  borderColor: lightTheme.border,

  ...shadow.sm,
};

/* =========================================================
   DARK CARD
========================================================= */

export const darkCard = {
  backgroundColor: darkTheme.surface,

  borderRadius: radius.lg,

  borderWidth: 1,

  borderColor: darkTheme.border,

  ...shadow.darkSm,
};

/* =========================================================
   DYNAMIC CARD
========================================================= */

export function getCard(isDark = false) {
  const activeColors = getColors(isDark);

  return {
    backgroundColor: activeColors.surface,

    borderRadius: radius.lg,

    borderWidth: 1,

    borderColor: activeColors.border,

    ...(isDark
      ? shadow.darkSm
      : shadow.sm),
  };
}

/* =========================================================
   SAFE AREA / TAB BAR
========================================================= */

export const TAB_BAR_HEIGHT = 60;

/* =========================================================
   RESPONSIVE
========================================================= */

export function isLargeScreen() {
  return (
    Dimensions.get("window").width >= 390
  );
}

export function getScreenWidth() {
  return Dimensions.get("window").width;
}

export function getScreenHeight() {
  return Dimensions.get("window").height;
}

export function responsiveSize(
  small,
  large
) {
  return isLargeScreen()
    ? large
    : small;
}