import { useState, useEffect, useLayoutEffect } from "react";
import { THEME_STORAGE_KEY } from "../utils/constants";

function getSystemTheme() {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

function readStoredTheme() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return localStorage.getItem(THEME_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

function applyTheme(theme) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage failures.
  }
}

export function useTheme(user) {
  const [theme, setTheme] = useState(() => {
    const preferredTheme = user?.preferences?.preferredTheme;

    if (preferredTheme === "light" || preferredTheme === "dark") {
      return preferredTheme;
    }

    return readStoredTheme() || getSystemTheme();
  });

  useEffect(() => {
    const preferredTheme = user?.preferences?.preferredTheme;

    if ((preferredTheme === "light" || preferredTheme === "dark") && preferredTheme !== theme) {
      setTheme(preferredTheme);
    }
  }, [theme, user?.preferences?.preferredTheme]);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return {
    theme,
    setTheme,
  };
}
