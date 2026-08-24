/** @type {import('tailwindcss').Config} */

// Every colour here resolves to a CSS variable defined in src/index.css.
// That indirection is what makes one class - `bg-surface`, `text-ink` -
// render correctly in BOTH themes without a single `dark:` variant in the
// pages. The variables are the exact values from the mobile app's
// src/theme/theme.js, so the two products stay visually identical.
//
// Variables hold raw "R G B" triplets rather than hex, which is what lets
// Tailwind's opacity modifiers (bg-brand/10, text-ink/60) keep working.
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: withOpacity("--rv-brand"),
          dark: withOpacity("--rv-brand-dark"),
          darker: withOpacity("--rv-brand-darker"),
          light: withOpacity("--rv-brand-light"),
          tint: withOpacity("--rv-brand-tint"),
          blue: withOpacity("--rv-brand-blue"),
          violet: withOpacity("--rv-brand-violet"),
          lavender: withOpacity("--rv-brand-lavender"),
          navy: withOpacity("--rv-brand-navy"),
        },

        ink: {
          DEFAULT: withOpacity("--rv-ink"),
          soft: withOpacity("--rv-ink-soft"),
        },
        slate: {
          DEFAULT: withOpacity("--rv-slate"),
          soft: withOpacity("--rv-slate-soft"),
          light: withOpacity("--rv-slate-light"),
        },

        bg: withOpacity("--rv-bg"),
        surface: {
          DEFAULT: withOpacity("--rv-surface"),
          soft: withOpacity("--rv-surface-soft"),
          elevated: withOpacity("--rv-surface-elevated"),
        },

        border: {
          DEFAULT: withOpacity("--rv-border"),
          soft: withOpacity("--rv-border-soft"),
          strong: withOpacity("--rv-border-strong"),
        },

        success: {
          DEFAULT: withOpacity("--rv-success"),
          light: withOpacity("--rv-success-light"),
          border: withOpacity("--rv-success-border"),
        },
        danger: {
          DEFAULT: withOpacity("--rv-danger"),
          light: withOpacity("--rv-danger-light"),
          border: withOpacity("--rv-danger-border"),
        },
        warn: {
          DEFAULT: withOpacity("--rv-warn"),
          light: withOpacity("--rv-warn-light"),
          border: withOpacity("--rv-warn-border"),
        },
        info: {
          DEFAULT: withOpacity("--rv-info"),
          light: withOpacity("--rv-info-light"),
          border: withOpacity("--rv-info-border"),
        },
        flag: {
          DEFAULT: withOpacity("--rv-flag"),
          light: withOpacity("--rv-flag-light"),
        },

        // Difficulty scale - same names the mobile app uses.
        easy: { DEFAULT: withOpacity("--rv-easy"), bg: withOpacity("--rv-easy-bg") },
        medium: { DEFAULT: withOpacity("--rv-medium"), bg: withOpacity("--rv-medium-bg") },
        hard: { DEFAULT: withOpacity("--rv-hard"), bg: withOpacity("--rv-hard-bg") },
        advanced: { DEFAULT: withOpacity("--rv-advanced"), bg: withOpacity("--rv-advanced-bg") },
      },

      // Mirrors the mobile radius scale exactly (theme.js `radius`).
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "26px",
        xxl: "32px",
      },

      // Mobile's shadow scale, translated from React Native's shadow props
      // to CSS box-shadow.
      boxShadow: {
        soft: "0 3px 10px -2px rgb(16 25 54 / 0.05)",
        card: "0 6px 18px -4px rgb(16 25 54 / 0.07)",
        lift: "0 10px 26px -6px rgb(16 25 54 / 0.10)",
        brand: "0 8px 22px -6px rgb(79 70 229 / 0.38)",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "system-ui", "sans-serif"],
      },

      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #2563EB 0%, #4F46E5 55%, #7C3AED 100%)",
        "brand-vivid": "linear-gradient(135deg, #3730A3 0%, #4F46E5 55%, #7C3AED 100%)",
        "hero-gradient": "linear-gradient(135deg, #5B6FF5 0%, #4F46E5 50%, #6D4AEF 100%)",
        "premium-gradient": "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
      },

      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "slide-in": "slide-in 0.22s cubic-bezier(0.32, 0.72, 0, 1)",
      },
    },
  },
  plugins: [],
};
