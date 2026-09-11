"use client";

import { useSyncExternalStore } from "react";

/* ============================================================
   Colorway store — the site's single accent (--acid) is a CSS
   variable, so a theme is just a different value on <html>.
   Persisted to localStorage("nr-theme"), applied pre-paint by
   an inline script in the root layout, mirrored here so React
   components (nav chip, ⌘K, terminal) can read/switch it.
   ============================================================ */

export type ThemeName = "acid" | "matrix" | "amber" | "void";

const ORDER: ThemeName[] = ["acid", "matrix", "amber"];

export const THEME_LABEL: Record<ThemeName, string> = {
  acid: "ACD",
  matrix: "MTRX",
  amber: "AMBR",
  void: "VOID",
};

export const THEME_HINT: Record<ThemeName, string> = {
  acid: "electric lime — factory default",
  matrix: "phosphor green — follow the white rabbit",
  amber: "amber CRT — 1978 terminal warmth",
  void: "signal red — earned, not given",
};

let theme: ThemeName = "acid";
let initialized = false;
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function notify() {
  listeners.forEach((l) => l());
}

function apply() {
  if (typeof document === "undefined") return;
  if (theme === "acid") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
}

/** Sync the module store with localStorage + the DOM. Call once on mount. */
export function initTheme() {
  if (initialized) return;
  initialized = true;
  try {
    const t = window.localStorage.getItem("nr-theme");
    if (t === "matrix" || t === "amber" || t === "void") theme = t;
  } catch {
    /* private mode — default stays */
  }
  apply();
}

export function getTheme(): ThemeName {
  return theme;
}

export function setTheme(t: ThemeName) {
  theme = t;
  try {
    window.localStorage.setItem("nr-theme", t);
  } catch {
    /* non-persistent is fine */
  }
  apply();
  notify();
  // trophy engine watches colorway variety — dynamic import avoids a cycle
  import("@/lib/achievements")
    .then((m) => m.trackTheme(t))
    .catch(() => {});
}

export function cycleTheme(): ThemeName {
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  setTheme(next);
  return next;
}

/** Reactive read — server snapshot stays "acid" (matches the SSR markup). */
export function useTheme(): ThemeName {
  return useSyncExternalStore(subscribe, getTheme, () => "acid" as ThemeName);
}
