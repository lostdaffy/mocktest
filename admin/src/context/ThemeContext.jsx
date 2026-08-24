import { createContext, useContext, useEffect, useState, useCallback } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "rv-admin-theme";

// Three states, matching how the mobile app behaves: an explicit "light" or
// "dark" choice, or "system" (the default) which follows the OS setting and
// keeps following it if the user changes it while the tab is open.
function readStoredPreference() {
  if (typeof window === "undefined") return "system";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
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
