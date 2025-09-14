"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

// Auto theme via system preference only (no manual override)
const ThemeContext = createContext({ theme: "system" });

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const on = !!mql.matches;
      setIsDark(on);
      document.documentElement.classList.toggle('dark', on);
    };
    apply();
    try { mql.addEventListener('change', apply); } catch { mql.addListener(apply); }
    return () => { try { mql.removeEventListener('change', apply); } catch { mql.removeListener(apply); } };
  }, []);

  const value = useMemo(() => ({ theme: isDark ? 'dark' : 'light' }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
