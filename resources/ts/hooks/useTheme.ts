import { useCallback, useEffect, useState } from "react";

export type VitrusTheme = "dark" | "light";

/**
 * Chat theme state with localStorage persistence, namespaced by siteHash.
 * The consumer applies the returned theme as `data-vitrus-theme` on the
 * chat shell so the CSS token palette (_ds-tokens.scss) switches.
 *
 * @since v0.2.0
 *
 * @returns Current theme and a toggle function.
 */
export function useTheme() {
  const siteHash = window.vitrusSettings?.siteHash || "default";
  const storageKey = `vitrus_theme_${siteHash}`;

  const [theme, setTheme] = useState<VitrusTheme>(() => {
    return localStorage.getItem(storageKey) === "light" ? "light" : "dark";
  });

  useEffect(() => {
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggleTheme };
}
