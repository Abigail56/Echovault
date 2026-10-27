import { useCallback, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "ev-theme";
const THEME_NAMES = { light: "echovault", dark: "echovault-dark" } as const;

/** Applied before React loads (see _document.tsx) to avoid a flash of the wrong theme. */
export const themeBootScript = `try{var t=localStorage.getItem("${STORAGE_KEY}");if(t==="light")document.documentElement.dataset.theme="${THEME_NAMES.light}";else if(t==="dark")document.documentElement.dataset.theme="${THEME_NAMES.dark}";}catch(e){}`;

function apply(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") delete root.dataset.theme;
  else root.dataset.theme = THEME_NAMES[preference];
}

function readStored(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  // Theme controls are only rendered in the browser (behind the auth check), so reading storage here is safe.
  const [preference, setPreference] = useState<ThemePreference>(() => (typeof window === "undefined" ? "system" : readStored()));

  const update = useCallback((next: ThemePreference) => {
    setPreference(next);
    apply(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be blocked (private mode); the theme still applies for this visit.
    }
  }, []);

  return { preference, setPreference: update };
}
