import type { Transition, Variants } from "framer-motion";

/* ============================================================
   Central motion tokens — no magic numbers inside components.
   Entrances: expo-out (long decelerating tail).
   Exits/clicks: sharp symmetric in-out. Never `ease`, never `linear`.
   ============================================================ */

export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_SHARP: [number, number, number, number] = [0.65, 0, 0.35, 1];
export const EASE_SNAP: [number, number, number, number] = [0.9, 0, 0.1, 1];

export const DUR = {
  fast: 0.28,
  base: 0.6,
  slow: 0.9,
  hero: 1.1,
  wipe: 0.75,
} as const;

export const transitionEntrance: Transition = {
  duration: DUR.slow,
  ease: EASE_OUT_EXPO,
};

export const transitionExit: Transition = {
  duration: DUR.fast,
  ease: EASE_SHARP,
};

export const transitionWipe: Transition = {
  duration: DUR.wipe,
  ease: EASE_SHARP,
};

/* ---------- deterministic pseudo-random (SSR-safe) ---------- */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Variable per-element delay — deliberately imperfect stagger.
 * A uniform i * step reads robotic; hash jitter keeps it organic
 * while remaining deterministic between server and client.
 */
export function charDelay(index: number, seed = 11, spread = 0.16): number {
  const rand = mulberry32(seed + index * 977);
  return index * 0.032 + rand() * spread;
}

/* ---------- shared variants ---------- */

/** Per-character rise used by the hero wordmark (use with `custom={i}`). */
export const charRise: Variants = {
  hidden: { y: "118%", rotate: 5 },
  show: (i: number) => ({
    y: "0%",
    rotate: 0,
    transition: { duration: DUR.hero, ease: EASE_OUT_EXPO, delay: 0.15 + charDelay(i, 23) },
  }),
};

/** Block reveal: clip wipes downward-out, rows can be staggered. */
export const clipReveal: Variants = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  show: (i: number = 0) => ({
    clipPath: "inset(0 0 0% 0)",
    transition: { duration: DUR.slow, ease: EASE_OUT_EXPO, delay: i * 0.07 },
  }),
};

/** Generic fade+rise for metadata / small elements. */
export const fadeRise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: DUR.base, ease: EASE_OUT_EXPO, delay: i * 0.06 },
  }),
};

/** Bare crossfade — the reduced-motion fallback everywhere. */
export const crossfade: Variants = {
  hidden: { opacity: 0 },
  show: (i: number = 0) => ({
    opacity: 1,
    transition: { duration: 0.35, delay: i * 0.04 },
  }),
};

/** Pick the right variant set depending on the environment. */
export function revealFor(reducedMotion: boolean): Variants {
  return reducedMotion ? crossfade : fadeRise;
}

/** Panel wipe used by preloader + route-style transitions. */
export const panelWipe: Variants = {
  enter: { y: "0%" },
  exit: (i: number) => ({
    y: "-101%",
    transition: { duration: DUR.wipe, ease: EASE_SHARP, delay: i * 0.09 },
  }),
};
