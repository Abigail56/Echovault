import { useCallback, useState } from "react";

export type ThemePreference = "dark" | "light" | "system";

const STORAGE_KEY = "ev-theme";
const THEME_NAMES = { light: "echovault", dark: "echovault-dark" } as const;

/**
 * Applied before React loads (see _document.tsx) to avoid a flash of the wrong
 * theme. Dark is the default; "system" follows the operating system.
 */
export const themeBootScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");var l=t==="light"||(t==="system"&&window.matchMedia("(prefers-color-scheme: light)").matches);document.documentElement.dataset.theme=l?"${THEME_NAMES.light}":"${THEME_NAMES.dark}";}catch(e){}`;

function resolve(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return preference;
}

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "system" ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function useTheme() {
  // Theme controls are only rendered in the browser (behind the auth check), so reading storage here is safe.
  const [preference, setPreference] = useState<ThemePreference>(() => (typeof window === "undefined" ? "dark" : readStored()));

  const update = useCallback((next: ThemePreference) => {
    setPreference(next);
    document.documentElement.dataset.theme = THEME_NAMES[resolve(next)];
    try {
      if (next === "dark") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
  }, []);

  return { preference, setPreference: update };
}
