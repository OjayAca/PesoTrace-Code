import { useState, useEffect } from "react";
import { THEME_STORAGE_KEY } from "../utils/constants";

export function useTheme(user) {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(THEME_STORAGE_KEY) || "light";
    }

    return "light";
  });

  useEffect(() => {
    const preferredTheme = user?.preferences?.preferredTheme;

    if (preferredTheme && preferredTheme !== theme) {
      setTheme(preferredTheme);
    }
  }, [user?.preferences?.preferredTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  return {
    theme,
    setTheme,
  };
}
