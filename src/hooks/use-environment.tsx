"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

/**
 * Environment flags via useSyncExternalStore on three media queries.
 * - isTouch:   no precise pointer → no custom cursor, no magnetic pull
 * - isMobile:  narrow viewport → pinned sections degrade to plain reveals
 * - reduced:   prefers-reduced-motion → crossfades only, no scrub, no cursor
 *
 * SSR always uses the "plain" snapshot; the preloader masks the one-frame
 * swap when the real client flags land.
 */
interface EnvFlags {
  ready: boolean;
  isTouch: boolean;
  isMobile: boolean;
  reducedMotion: boolean;
  /** pinned choreography allowed = desktop + fine pointer + motion OK */
  canPin: boolean;
}

const EnvContext = createContext<EnvFlags>({
  ready: true,
  isTouch: false,
  isMobile: false,
  reducedMotion: false,
  canPin: true,
});

/* ---------- media-query external store ---------- */

interface Mqs {
  touch: MediaQueryList;
  mobile: MediaQueryList;
  reduced: MediaQueryList;
}
let cached: Mqs | null = null;

function mqs(): Mqs {
  if (!cached) {
    cached = {
      touch: window.matchMedia("(pointer: coarse)"),
      mobile: window.matchMedia("(max-width: 767px)"),
      reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
    };
  }
  return cached;
}

function getSnapshot(): string {
  const m = mqs();
  return `${m.touch.matches ? 1 : 0}-${m.mobile.matches ? 1 : 0}-${m.reduced.matches ? 1 : 0}`;
}

function getServerSnapshot(): string {
  return "0-0-0";
}

function subscribe(cb: () => void): () => void {
  const m = mqs();
  const list = [m.touch, m.mobile, m.reduced];
  list.forEach((q) => q.addEventListener("change", cb));
  return () => list.forEach((q) => q.removeEventListener("change", cb));
}

/* ---------- provider ---------- */

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const flags = useMemo<EnvFlags>(() => {
    const [touch, mobile, reduced] = snapshot.split("-").map((s) => s === "1");
    return {
      ready: true,
      isTouch: touch,
      isMobile: mobile,
      reducedMotion: reduced,
      // pins need viewport room + a precise pointer + motion consent
      canPin: !touch && !mobile && !reduced,
    };
  }, [snapshot]);

  return <EnvContext.Provider value={flags}>{children}</EnvContext.Provider>;
}

export function useEnvironment(): EnvFlags {
  return useContext(EnvContext);
}
