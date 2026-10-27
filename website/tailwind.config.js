/** @type {import('tailwindcss').Config} */

// Brand tokens sampled from the Rankveer logo: deep navy ("Rank"), indigo
// (the R), violet ("veer" and the arrow) on a soft lavender. No bright blue -
// the logo has none, and a blue-led gradient made the site look off-brand.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F3CC9",
          dark: "#2D2A82",
          darker: "#0E1A47",
          light: "#ECE8FB",
          tint: "#F6F4FD",
          violet: "#7B4FE0",
          lavender: "#A98BF7",
        },
        ink: { DEFAULT: "#0E1A47", soft: "#343C63" },
        // A touch darker than the app's #667085 so body text passes WCAG AA on white.
        slate: { DEFAULT: "#5F6B85", soft: "#98A2B3", light: "#F1F3F8" },
        bg: "#F8F7FD",
        surface: "#FFFFFF",
        line: "#E6E3F3",
        success: { DEFAULT: "#16A34A", light: "#EAF8F0" },
        danger: { DEFAULT: "#DC3545", light: "#FEF0F2" },
        warn: { DEFAULT: "#D97706", light: "#FFF7E8" },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Noto Sans Devanagari", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        hindi: ["Noto Sans Devanagari", "Nirmala UI", "Mangal", "system-ui", "sans-serif"],
      },

      // Same scale as the app's `radius` tokens.
      borderRadius: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "26px",
        xxl: "32px",
      },

      boxShadow: {
        soft: "0 3px 10px -2px rgb(14 26 71 / 0.05)",
        card: "0 8px 22px -6px rgb(14 26 71 / 0.09)",
        lift: "0 22px 44px -16px rgb(14 26 71 / 0.22)",
        brand: "0 10px 24px -8px rgb(79 60 201 / 0.45)",
        "brand-lg": "0 14px 30px -10px rgb(79 60 201 / 0.55)",
        phone: "0 50px 90px -40px rgb(14 26 71 / 0.55), inset 0 0 0 1px rgb(255 255 255 / 0.08)",
      },

      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #2D2A82 0%, #4F3CC9 50%, #8455E6 100%)",
        "hero-glow":
          "radial-gradient(620px 420px at 88% 18%, rgb(123 79 224 / 0.14), transparent 62%), radial-gradient(540px 380px at 6% 0%, rgb(79 60 201 / 0.1), transparent 62%)",
        "live-band": "linear-gradient(135deg, #080F2E 0%, #0E1A47 50%, #2D2A82 100%)",
        "live-glow":
          "radial-gradient(520px 340px at 92% 8%, rgb(132 85 230 / 0.32), transparent 62%), radial-gradient(420px 300px at 0% 100%, rgb(79 60 201 / 0.24), transparent 60%)",
      },

      maxWidth: {
        site: "1180px",
      },

      keyframes: {
        "live-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgb(239 68 68 / 0.55)" },
          "70%": { boxShadow: "0 0 0 10px rgb(239 68 68 / 0)" },
          "100%": { boxShadow: "0 0 0 0 rgb(239 68 68 / 0)" },
        },
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },

      animation: {
        "live-pulse": "live-pulse 1.8s infinite",
        // `backwards` holds the start frame only while an animation-delay
        // runs, then hands transform back to normal styles - so cards that
        // also lift on hover keep working after they've faded in.
        "reveal-up": "reveal-up 0.6s ease backwards",
      },
    },
  },
  plugins: [],
};
