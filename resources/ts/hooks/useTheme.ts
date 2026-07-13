import { useCallback, useEffect, useState } from "react";

export type VitrusTheme = "dark" | "light";

/**
 * Chat theme state with localStorage persistence, namespaced by siteHash.
 * The consumer applies the returned theme as `data-vitrus-theme` on the
 * chat shell so the CSS token palette (_ds-tokens.scss) switches.
 *
 * Each surface may keep its own theme: pass a `prefix` to namespace the
 * storage key, so the floating widget and the Chat page persist separately.
 *
 * @since v0.3.0
 *
 * @param {string} prefix Optional. Storage-key prefix. Default 'vitrus_theme'.
 * @returns Current theme and a toggle function.
 */
export function useTheme(prefix = "vitrus_theme") {
  const siteHash = window.vitrusSettings?.siteHash || "default";
  const storageKey = `${prefix}_${siteHash}`;

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
