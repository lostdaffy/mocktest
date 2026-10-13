import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "rv-admin-theme-v2";
const OLD_KEY = "rv-admin-theme";

// Three states: "light" (the default), "dark", or "system", which follows
// the OS setting. Light is the default because the panel is a work tool used
// for hours - a phone or laptop set to dark used to open it dark without the
// admin ever choosing that.
function readStoredPreference() {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") return stored;
  // The old key held "system" for everyone by default; only an explicit
  // dark choice is carried over.
  return window.localStorage.getItem(OLD_KEY) === "dark" ? "dark" : "light";
}

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readStoredPreference);
  const [isDark, setIsDark] = useState(() =>
    readStoredPreference() === "system" ? systemPrefersDark() : readStoredPreference() === "dark"
  );

  // Resolve preference -> actual theme, and keep it in sync with the OS
  // while the preference is "system".
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    function resolve() {
      setIsDark(preference === "system" ? media.matches : preference === "dark");
    }

    resolve();
    if (preference !== "system") return;

    media.addEventListener("change", resolve);
    return () => media.removeEventListener("change", resolve);
  }, [preference]);

  // The single place that touches the DOM. Tailwind's darkMode:"class"
  // reads this one class on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, [isDark]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, preference);
  }, [preference]);

  // Cycles light -> dark -> system, so the toggle button can reach every
  // state without needing a dropdown.
  const cycleTheme = useCallback(() => {
    setPreference((current) => (current === "light" ? "dark" : current === "dark" ? "system" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, setPreference, cycleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
